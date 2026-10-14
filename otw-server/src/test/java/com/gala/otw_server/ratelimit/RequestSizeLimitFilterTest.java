package com.gala.otw_server.ratelimit;

import tools.jackson.databind.ObjectMapper;
import com.gala.otw_server.ratelimit.RequestSizeLimitFilter.PayloadTooLargeException;
import com.gala.otw_server.common.ErrorResponse;
import com.gala.otw_server.common.GlobalExceptionHandler;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.InputStream;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class RequestSizeLimitFilterTest {

    private final RequestSizeLimitFilter filter = new RequestSizeLimitFilter(new ObjectMapper());

    private static MockHttpServletRequest post(byte[] body) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/rooms");
        request.setContentType("application/json");
        request.setContent(body);
        return request;
    }

    @Test
    @DisplayName("a declared body over 64 KB gets 413 PAYLOAD_TOO_LARGE without reaching the controller")
    void declaredLengthOverCap_returns413() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilterInternal(post(new byte[RequestSizeLimitFilter.MAX_BODY_BYTES + 1]), response, chain);

        assertThat(response.getStatus()).isEqualTo(413);
        assertThat(response.getContentAsString()).contains("PAYLOAD_TOO_LARGE");
        verifyNoInteractions(chain);
    }

    @Test
    @DisplayName("a body at the cap is read in full")
    void bodyAtCap_passes() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<Integer> readBytes = new AtomicReference<>();

        filter.doFilterInternal(post(new byte[RequestSizeLimitFilter.MAX_BODY_BYTES]), response,
                (req, res) -> readBytes.set(req.getInputStream().readAllBytes().length));

        assertThat(readBytes.get()).isEqualTo(RequestSizeLimitFilter.MAX_BODY_BYTES);
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("a body with no declared length (chunked) stops being read at the cap")
    void undeclaredLengthOverCap_stopsReading() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/rooms") {
            @Override
            public long getContentLengthLong() {
                return -1;
            }
        };
        request.setContent(new byte[RequestSizeLimitFilter.MAX_BODY_BYTES * 2]);

        assertThatThrownBy(() -> filter.doFilterInternal(request, new MockHttpServletResponse(),
                (req, res) -> req.getInputStream().readAllBytes()))
                .isInstanceOf(PayloadTooLargeException.class);
    }

    @Test
    @DisplayName("a body cut off mid-JSON comes back as 413 PAYLOAD_TOO_LARGE, not 400 or 500")
    void cutOffWhileParsingJson_mapsTo413() {
        HttpInputMessage message = new HttpInputMessage() {
            @Override
            public InputStream getBody() {
                return new InputStream() {
                    @Override
                    public int read() throws PayloadTooLargeException {
                        throw new PayloadTooLargeException();
                    }
                };
            }

            @Override
            public HttpHeaders getHeaders() {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                return headers;
            }
        };

        Throwable thrown = catchThrowable(() -> new JacksonJsonHttpMessageConverter().read(Map.class, message));
        assertThat(thrown).isInstanceOf(HttpMessageNotReadableException.class);

        ResponseEntity<ErrorResponse> response =
                new GlobalExceptionHandler().handleUnreadable((HttpMessageNotReadableException) thrown);
        assertThat(response.getStatusCode().value()).isEqualTo(413);
        assertThat(response.getBody().code()).isEqualTo("PAYLOAD_TOO_LARGE");
    }
}

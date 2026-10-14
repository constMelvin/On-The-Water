package com.gala.otw_server.ratelimit;

import tools.jackson.databind.ObjectMapper;
import com.gala.otw_server.common.ErrorCode;
import com.gala.otw_server.common.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Caps request bodies at {@link #MAX_BODY_BYTES}. The API only takes small JSON (no file bytes: uploads
 * go straight to Google Drive), but Spring reads a JSON body fully before {@code @Valid} runs, and
 * Tomcat's own post-size limit covers form posts only.
 * <ul>
 *   <li>A declared {@code Content-Length} over the cap: {@code 413 PAYLOAD_TOO_LARGE} before anything reads it.</li>
 *   <li>No length (chunked) or a wrong one: reading stops at the cap with {@link PayloadTooLargeException},
 *       which {@code GlobalExceptionHandler} answers with the same 413.</li>
 * </ul>
 * Not a @Component on purpose: SecurityConfig adds it after RateLimitFilter, so only verified accounts within
 * their request budget get this far, and the 413 keeps the CORS headers.
 */
public class RequestSizeLimitFilter extends OncePerRequestFilter {

    public static final int MAX_BODY_BYTES = 64 * 1024;

    private final ObjectMapper objectMapper;

    public RequestSizeLimitFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (request.getContentLengthLong() > MAX_BODY_BYTES) {
            response.setStatus(HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(), ErrorResponse.of(ErrorCode.PAYLOAD_TOO_LARGE, tooLargeMessage()));
            return;
        }
        filterChain.doFilter(new LimitedRequest(request), response);
    }

    public static String tooLargeMessage() {
        return "Request body is too large (" + MAX_BODY_BYTES / 1024 + " KB max)";
    }

    /** Thrown while reading a body that turns out to be over the cap. */
    public static class PayloadTooLargeException extends IOException {
        public PayloadTooLargeException() {
            super(tooLargeMessage());
        }
    }

    private static final class LimitedRequest extends HttpServletRequestWrapper {
        private ServletInputStream limited;

        LimitedRequest(HttpServletRequest request) {
            super(request);
        }

        @Override
        public ServletInputStream getInputStream() throws IOException {
            if (limited == null) {
                limited = new LimitedInputStream(super.getInputStream());
            }
            return limited;
        }
    }

    private static final class LimitedInputStream extends ServletInputStream {
        private final ServletInputStream in;
        private long read;

        LimitedInputStream(ServletInputStream in) {
            this.in = in;
        }

        @Override
        public int read() throws IOException {
            int b = in.read();
            if (b != -1) count(1);
            return b;
        }

        @Override
        public int read(byte[] buf, int off, int len) throws IOException {
            int n = in.read(buf, off, len);
            if (n > 0) count(n);
            return n;
        }

        private void count(int n) throws PayloadTooLargeException {
            read += n;
            if (read > MAX_BODY_BYTES) throw new PayloadTooLargeException();
        }

        @Override
        public boolean isFinished() {
            return in.isFinished();
        }

        @Override
        public boolean isReady() {
            return in.isReady();
        }

        @Override
        public void setReadListener(ReadListener listener) {
            in.setReadListener(listener);
        }
    }
}

package com.gala.otw_server.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RateLimitFilterTest {

    @Mock
    private RateLimiterService rateLimiterService;

    @Mock
    private FilterChain filterChain;

    private RateLimitFilter filter;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        filter = new RateLimitFilter(rateLimiterService, objectMapper);
    }

    @Test
    @DisplayName("Join endpoint enforces 10 req/min limit")
    void joinEndpoint_enforcesAntiBruteForceLimit() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/rooms/join");
        request.setRemoteAddr("192.168.1.100");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(rateLimiterService.tryAcquireCount(contains("ratelimit:join:"), eq(10), any(Duration.class)))
                .thenReturn(true);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("Exceeding rate limit returns 429 with Retry-After header and stops filter chain")
    void rateLimitExceeded_returns429() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/rooms/join");
        request.setRemoteAddr("192.168.1.100");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(rateLimiterService.tryAcquireCount(contains("ratelimit:join:"), eq(10), any(Duration.class)))
                .thenReturn(false);

        filter.doFilterInternal(request, response, filterChain);

        verifyNoInteractions(filterChain);
        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getHeader("Retry-After")).isEqualTo("60");
        assertThat(response.getContentAsString()).contains("TOO_MANY_REQUESTS");
    }

    @Test
    @DisplayName("Gala code preview and Enter a Gala share a 10 req/min anti-guessing limit")
    void codeLookupEndpoints_enforceAntiGuessingLimit() throws Exception {
        when(rateLimiterService.tryAcquireCount(contains("ratelimit:code:"), eq(10), any(Duration.class)))
                .thenReturn(true);

        for (MockHttpServletRequest request : new MockHttpServletRequest[]{
                new MockHttpServletRequest("GET", "/api/v1/rooms/preview"),
                new MockHttpServletRequest("POST", "/api/v1/rooms/enter"),
                new MockHttpServletRequest("POST", "/api/v1/rooms/enter/claim")}) {
            request.setRemoteAddr("192.168.1.7");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, filterChain);
            verify(filterChain).doFilter(request, response);
        }
        verify(rateLimiterService, times(3)).tryAcquireCount(contains("ratelimit:code:"), eq(10), any(Duration.class));
    }

    @Test
    @DisplayName("Creating a gala is capped at 10 per hour per client")
    void createRoom_enforcesHourlyLimit() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/rooms");
        request.setRemoteAddr("192.168.1.50");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(rateLimiterService.tryAcquireCount(contains("ratelimit:create:"), eq(10), eq(Duration.ofHours(1))))
                .thenReturn(false);

        filter.doFilterInternal(request, response, filterChain);

        verifyNoInteractions(filterChain);
        assertThat(response.getStatus()).isEqualTo(429);
    }

    @Test
    @DisplayName("Write operations enforce 60 req/min limit")
    void writeEndpoint_enforcesWriteLimit() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/rooms/some-id/checklist");
        request.setRemoteAddr("192.168.1.50");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(rateLimiterService.tryAcquireCount(contains("ratelimit:write:"), eq(60), any(Duration.class)))
                .thenReturn(true);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Read operations enforce 180 req/min limit")
    void readEndpoint_enforcesReadLimit() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/rooms/some-id");
        request.setRemoteAddr("192.168.1.50");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(rateLimiterService.tryAcquireCount(contains("ratelimit:read:"), eq(180), any(Duration.class)))
                .thenReturn(true);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Swagger and actuator documentation endpoints bypass rate limiting")
    void docsAndHealth_bypassesRateLimiting() {
        MockHttpServletRequest swaggerReq = new MockHttpServletRequest("GET", "/swagger-ui/index.html");
        MockHttpServletRequest actuatorReq = new MockHttpServletRequest("GET", "/actuator/health");

        assertThat(filter.shouldNotFilter(swaggerReq)).isTrue();
        assertThat(filter.shouldNotFilter(actuatorReq)).isTrue();
    }
}

package com.gala.otw_server.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gala.otw_server.common.ErrorCode;
import com.gala.otw_server.common.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;


@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 50)
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimiterService rateLimiterService;
    private final ObjectMapper objectMapper;

    public RateLimitFilter(@org.springframework.beans.factory.annotation.Autowired(required = false) RateLimiterService rateLimiterService, ObjectMapper objectMapper) {
        this.rateLimiterService = rateLimiterService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Skip CORS preflights, documentation, health checks, and static assets
        if (HttpMethod.OPTIONS.matches(request.getMethod())) return true;
        if (path.startsWith("/swagger-ui") || path.startsWith("/v3/api-docs")) return true;
        if (path.startsWith("/actuator")) return true;
        if (path.startsWith("/api/v1/public")) return true;
        return !path.startsWith("/api/v1");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        if (rateLimiterService == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIdentifier = resolveClientIdentifier(request);
        String path = request.getRequestURI();
        String method = request.getMethod();

        boolean allowed = true;

        if (isJoinEndpoint(path, method)) {
            // Anti-brute force for 8-char codes: max 10 requests per minute
            allowed = rateLimiterService.tryAcquireCount(
                    "ratelimit:join:" + clientIdentifier, 10, Duration.ofMinutes(1));
        } else if (isWriteMethod(method)) {
            // Write operations: max 60 requests per minute
            allowed = rateLimiterService.tryAcquireCount(
                    "ratelimit:write:" + clientIdentifier, 60, Duration.ofMinutes(1));
        } else {
            // Read operations: max 180 requests per minute
            allowed = rateLimiterService.tryAcquireCount(
                    "ratelimit:read:" + clientIdentifier, 180, Duration.ofMinutes(1));
        }

        if (!allowed) {
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(),
                    ErrorResponse.of(ErrorCode.TOO_MANY_REQUESTS, "Rate limit exceeded. Please wait before retrying."));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isJoinEndpoint(String path, String method) {
        return HttpMethod.POST.matches(method) &&
                (path.endsWith("/rooms/join") || path.endsWith("/groups/join"));
    }

    private boolean isWriteMethod(String method) {
        return HttpMethod.POST.matches(method) ||
                HttpMethod.PUT.matches(method) ||
                HttpMethod.PATCH.matches(method) ||
                HttpMethod.DELETE.matches(method);
    }

    private String resolveClientIdentifier(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            return "user:" + auth.getName();
        }

        // Fallback to client IP
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return "ip:" + forwarded.split(",")[0].trim();
        }
        return "ip:" + request.getRemoteAddr();
    }
}

package com.gala.otw_server.ratelimit;

import tools.jackson.databind.ObjectMapper;
import com.gala.otw_server.common.ErrorCode;
import com.gala.otw_server.common.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

/**
 * Per-client request budgets. Not a @Component on purpose: SecurityConfig adds it to the
 * security chain right after the bearer-token filter, so
 * <ul>
 *   <li>the JWT is already verified and budgets are keyed per user ({@code user:<sub>}),
 *       not per IP (everyone behind one NAT or on localhost would otherwise share a budget);</li>
 *   <li>it runs after the CorsFilter, so a 429 still carries Access-Control-Allow-Origin and
 *       the browser shows the 429 instead of a misleading CORS error.</li>
 * </ul>
 * Requests with no valid token fall back to the client IP (they are rejected with 401 later).
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimiterService rateLimiterService;
    private final ObjectMapper objectMapper;

    /** @param rateLimiterService may be null (no limiter configured): every request passes. */
    public RateLimitFilter(RateLimiterService rateLimiterService, ObjectMapper objectMapper) {
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
        } else if (isCodeLookupEndpoint(path, method)) {
            // Code preview (code guessing): same budget as join
            allowed = rateLimiterService.tryAcquireCount(
                    "ratelimit:code:" + clientIdentifier, 10, Duration.ofMinutes(1));
        } else if (isCreateRoomEndpoint(path, method)) {
            // Cap gala creation per client
            allowed = rateLimiterService.tryAcquireCount(
                    "ratelimit:create:" + clientIdentifier, 10, Duration.ofHours(1));
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

    private boolean isCodeLookupEndpoint(String path, String method) {
        return HttpMethod.GET.matches(method) && path.endsWith("/rooms/preview");
    }

    private boolean isCreateRoomEndpoint(String path, String method) {
        return HttpMethod.POST.matches(method) && path.equals("/api/v1/rooms");
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

        // Fallback to client IP. Never read X-Forwarded-For here (anyone can send it): with
        // server.forward-headers-strategy=native, getRemoteAddr() is already the real client
        // when the request came through a trusted proxy.
        return "ip:" + request.getRemoteAddr();
    }
}

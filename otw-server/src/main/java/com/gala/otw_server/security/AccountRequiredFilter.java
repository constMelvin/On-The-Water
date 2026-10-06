package com.gala.otw_server.security;

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

/**
 * Account-required gate for the whole API. A verified token that is an anonymous Supabase
 * session (or has no email) is answered with {@code 401 ACCOUNT_REQUIRED} before any controller,
 * aspect or rate limiter runs. Fail-closed: new endpoints are protected without annotations.
 *
 * <p>Not a @Component on purpose: SecurityConfig adds it right after the bearer-token filter
 * (so the JWT is already verified) and before {@code RateLimitFilter}. Requests with no
 * authentication pass through untouched; the resource server answers those with UNAUTHENTICATED.
 * Skips exactly the paths SecurityConfig permits without authentication.
 */
public class AccountRequiredFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;

    public AccountRequiredFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) return true;
        String path = request.getRequestURI();
        return path.equals("/actuator/health")
                || path.equals("/actuator/info")
                || path.startsWith("/api/v1/public/")
                || path.equals("/swagger-ui")
                || path.startsWith("/swagger-ui/")
                || path.equals("/swagger-ui.html")
                || path.equals("/v3/api-docs")
                || path.startsWith("/v3/api-docs/")
                || path.equals("/v3/api-docs.yaml");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof SupabaseAuthenticationToken token && !token.getPrincipal().hasAccount()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(),
                    ErrorResponse.of(ErrorCode.ACCOUNT_REQUIRED, "Create an account or log in to use OTW"));
            return;
        }
        filterChain.doFilter(request, response);
    }
}

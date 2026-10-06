package com.gala.otw_server.security;

import com.gala.otw_server.common.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import org.springframework.security.oauth2.jwt.Jwt;
import java.util.List;
import java.util.UUID;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Sprint 1 exit-gate test: a protected endpoint must reject an invalid/missing token.
 *
 * <p>This test is intentionally standalone — it does NOT start a DB or Redis.
 * It only verifies the JWT filter layer behaves correctly:
 * <ul>
 *   <li>No token → 401 with {@code UNAUTHENTICATED} error code</li>
 *   <li>Garbage token → 401 with {@code UNAUTHENTICATED} error code</li>
 *   <li>Public ping endpoint → 200 without any token</li>
 * </ul>
 *
 * <p><b>Note:</b> This test overrides the JWKS URI and issuer URI so that
 * Spring's JwtDecoder can start without a real Supabase project URL.
 * A garbage token will always fail validation (bad signature), which is the
 * expected behaviour we are testing.
 */
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import com.gala.otw_server.config.CorsConfig;
import com.gala.otw_server.config.SecurityConfig;

@WebMvcTest(controllers = AuthController.class)
@Import({SecurityConfig.class, CorsConfig.class, SupabaseJwtAuthenticationConverter.class})
@TestPropertySource(properties = {
        // Point to a non-existent JWKS URI so the decoder starts but rejects every token
        "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://example.invalid/jwks.json",
        "spring.security.oauth2.resourceserver.jwt.issuer-uri=https://example.invalid"
})
@DisplayName("Sprint 1 — JWT filter security gate")
class SecurityFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @org.springframework.test.context.bean.override.mockito.MockitoBean
    private com.gala.otw_server.ratelimit.RateLimiterService rateLimiterService;

    @org.junit.jupiter.api.BeforeEach
    void setUpRateLimit() {
        org.mockito.Mockito.lenient().when(rateLimiterService.tryAcquireCount(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.any(java.time.Duration.class)))
                .thenReturn(true);
    }

    @Test
    @DisplayName("GET /api/v1/auth/me without token → 401 UNAUTHENTICATED")
    void noToken_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.code").value(ErrorCode.UNAUTHENTICATED.name()));
    }

    @Test
    @DisplayName("GET /api/v1/auth/me with garbage token → 401 UNAUTHENTICATED")
    void garbageToken_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer this.is.not.a.valid.jwt"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.code").value(ErrorCode.UNAUTHENTICATED.name()));
    }

    @Test
    @DisplayName("GET /api/v1/public/ping without token → 200 (public endpoint)")
    void publicPing_noAuth_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/public/ping"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("A rate-limited request returns 429 that still carries the CORS header")
    void rateLimited_returns429WithCorsHeader() throws Exception {
        org.mockito.Mockito.when(rateLimiterService.tryAcquireCount(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.any(java.time.Duration.class)))
                .thenReturn(false);

        mockMvc.perform(get("/api/v1/auth/me").header("Origin", "http://localhost:3000"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"))
                .andExpect(header().string("Retry-After", "60"))
                .andExpect(jsonPath("$.code").value(ErrorCode.TOO_MANY_REQUESTS.name()));
    }

    @Test
    @DisplayName("GET /swagger-ui/index.html without token → passes security filter (not 401)")
    void swaggerUi_noAuth_passesSecurity() throws Exception {
        mockMvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().is(org.hamcrest.Matchers.not(401)));
    }

    private static SupabaseAuthenticationToken token(boolean anonymous, String email) {
        Jwt.Builder b = Jwt.withTokenValue("t").header("alg", "RS256").subject(UUID.randomUUID().toString())
                .claim("is_anonymous", anonymous);
        if (email != null) b.claim("email", email);
        Jwt jwt = b.build();
        return new SupabaseAuthenticationToken(SupabaseUser.fromJwt(jwt), jwt, List.of());
    }

    @Test
    @DisplayName("anonymous JWT on a protected route -> 401 ACCOUNT_REQUIRED, rate limiter untouched")
    void anonymousJwt_accountRequired() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me").with(authentication(token(true, null))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(ErrorCode.ACCOUNT_REQUIRED.name()));
        verifyNoInteractions(rateLimiterService);
    }

    @Test
    @DisplayName("registered JWT on a protected route -> 200")
    void accountJwt_passes() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me").with(authentication(token(false, "a@b.co"))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("anonymous JWT on the public ping -> still 200")
    void anonymousJwt_publicPing() throws Exception {
        mockMvc.perform(get("/api/v1/public/ping").with(authentication(token(true, null))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("anonymous JWT on POST /rooms/join -> 401 ACCOUNT_REQUIRED (rejected before the controller)")
    void anonymousJwt_joinRoom_accountRequired() throws Exception {
        mockMvc.perform(post("/api/v1/rooms/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"X\"}")
                        .with(authentication(token(true, null))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(ErrorCode.ACCOUNT_REQUIRED.name()));
    }
}

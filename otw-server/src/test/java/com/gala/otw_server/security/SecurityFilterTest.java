package com.gala.otw_server.security;

import com.gala.otw_server.common.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
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

    @org.springframework.boot.test.mock.mockito.MockBean
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
    @DisplayName("GET /swagger-ui/index.html without token → passes security filter (not 401)")
    void swaggerUi_noAuth_passesSecurity() throws Exception {
        mockMvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().is(org.hamcrest.Matchers.not(401)));
    }
}

package com.gala.otw_server.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AccountRequiredFilterTest {

    private final AccountRequiredFilter filter = new AccountRequiredFilter(new ObjectMapper());

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private void authenticate(Boolean isAnonymous, String email) {
        Jwt.Builder b = Jwt.withTokenValue("token").header("alg", "RS256").subject(UUID.randomUUID().toString());
        if (isAnonymous != null) b.claim("is_anonymous", isAnonymous);
        if (email != null) b.claim("email", email);
        Jwt jwt = b.build();
        SecurityContextHolder.getContext().setAuthentication(
                new SupabaseAuthenticationToken(SupabaseUser.fromJwt(jwt), jwt, List.of()));
    }

    /** Runs the filter; returns the response, and whether the chain was reached. */
    private Result run(String method, String path) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest(method, path);
        req.setRequestURI(path);
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(req, res, chain);
        return new Result(res, chain.getRequest() != null);
    }

    private record Result(MockHttpServletResponse res, boolean passed) {}

    @Test
    @DisplayName("anonymous session is rejected with 401 ACCOUNT_REQUIRED")
    void anonymous_rejected() throws Exception {
        authenticate(true, "");
        Result r = run("POST", "/api/v1/rooms/join");
        assertThat(r.passed()).isFalse();
        assertThat(r.res().getStatus()).isEqualTo(401);
        assertThat(r.res().getContentAsString()).contains("\"code\":\"ACCOUNT_REQUIRED\"");
    }

    @Test
    @DisplayName("token with no is_anonymous claim and no email is rejected (fail-closed)")
    void noClaims_rejected() throws Exception {
        authenticate(null, null);
        assertThat(run("GET", "/api/v1/rooms/x").res().getStatus()).isEqualTo(401);
    }

    @Test
    @DisplayName("is_anonymous=false but blank email is still rejected")
    void blankEmail_rejected() throws Exception {
        authenticate(false, "  ");
        assertThat(run("GET", "/api/v1/me/rooms").res().getStatus()).isEqualTo(401);
    }

    @Test
    @DisplayName("registered email account passes through")
    void account_passes() throws Exception {
        authenticate(false, "melvin@example.com");
        Result r = run("GET", "/api/v1/rooms/x");
        assertThat(r.passed()).isTrue();
        assertThat(r.res().getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("no authentication at all passes through (the resource server answers UNAUTHENTICATED)")
    void noAuth_passesThrough() throws Exception {
        assertThat(run("GET", "/api/v1/rooms/x").passed()).isTrue();
    }

    @Test
    @DisplayName("exact public paths and preflights are skipped even for an anonymous token")
    void publicPaths_skipped() throws Exception {
        authenticate(true, "");
        assertThat(run("GET", "/api/v1/public/ping").passed()).isTrue();
        assertThat(run("GET", "/actuator/health").passed()).isTrue();
        assertThat(run("GET", "/v3/api-docs/swagger-config").passed()).isTrue();
        assertThat(run("GET", "/swagger-ui").passed()).isTrue();
        assertThat(run("GET", "/v3/api-docs").passed()).isTrue();
        assertThat(run("OPTIONS", "/api/v1/rooms").passed()).isTrue();
    }

    @Test
    @DisplayName("look-alike paths are NOT skipped")
    void lookAlikePaths_rejected() throws Exception {
        authenticate(true, "");
        assertThat(run("GET", "/api/v1/publicx/anything").res().getStatus()).isEqualTo(401);
        assertThat(run("GET", "/actuator/env").res().getStatus()).isEqualTo(401);
        assertThat(run("GET", "/api/v1/public").res().getStatus()).isEqualTo(401);
    }
}

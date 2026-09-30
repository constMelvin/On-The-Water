package com.gala.otw_server.security;

import com.gala.otw_server.common.DomainExceptions.AccountRequiredException;
import com.gala.otw_server.security.auth.AccountRequiredAspect;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Anonymous sessions are allowed into galas but not into account-only endpoints.
 */
class AccountRequiredAspectTest {

    private final CurrentUserProvider currentUser = new CurrentUserProvider();
    private final AccountRequiredAspect aspect = new AccountRequiredAspect(currentUser);

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private void authenticate(Boolean isAnonymous, String email) {
        Jwt.Builder b = Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .subject(UUID.randomUUID().toString());
        if (isAnonymous != null) b.claim("is_anonymous", isAnonymous);
        if (email != null) b.claim("email", email);
        Jwt jwt = b.build();
        SecurityContextHolder.getContext().setAuthentication(
                new SupabaseAuthenticationToken(SupabaseUser.fromJwt(jwt), jwt, java.util.List.of()));
    }

    @Test
    @DisplayName("anonymous session is rejected with ACCOUNT_REQUIRED")
    void anonymous_isRejected() {
        authenticate(true, "");
        assertThat(currentUser.isAnonymous()).isTrue();
        assertThatThrownBy(aspect::enforce).isInstanceOf(AccountRequiredException.class);
    }

    @Test
    @DisplayName("token with no is_anonymous claim and no email is treated as anonymous (fail-closed)")
    void missingClaimAndEmail_isRejected() {
        authenticate(null, null);
        assertThatThrownBy(aspect::enforce).isInstanceOf(AccountRequiredException.class);
    }

    @Test
    @DisplayName("registered email account passes")
    void registered_passes() {
        authenticate(false, "melvin@example.com");
        assertThat(currentUser.isAnonymous()).isFalse();
        assertThatCode(aspect::enforce).doesNotThrowAnyException();
    }
}

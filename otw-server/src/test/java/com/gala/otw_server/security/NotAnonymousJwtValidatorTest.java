package com.gala.otw_server.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class NotAnonymousJwtValidatorTest {

    private final NotAnonymousJwtValidator validator = new NotAnonymousJwtValidator();

    private Jwt jwt(Boolean isAnonymous, String email) {
        Jwt.Builder b = Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .subject(UUID.randomUUID().toString());
        if (isAnonymous != null) b.claim("is_anonymous", isAnonymous);
        if (email != null) b.claim("email", email);
        return b.build();
    }

    @Test
    @DisplayName("anonymous session token is rejected")
    void anonymousToken_isRejected() {
        OAuth2TokenValidatorResult result = validator.validate(jwt(true, ""));

        assertThat(result.hasErrors()).isTrue();
        assertThat(result.getErrors())
                .extracting(OAuth2Error::getErrorCode)
                .containsExactly(NotAnonymousJwtValidator.ERROR_CODE);
    }

    @Test
    @DisplayName("token with no is_anonymous claim and no email is rejected (fail-closed)")
    void missingClaimAndNoEmail_isRejected() {
        assertThat(validator.validate(jwt(null, null)).hasErrors()).isTrue();
    }

    @Test
    @DisplayName("registered email account token is accepted")
    void registeredToken_isAccepted() {
        assertThat(validator.validate(jwt(false, "melvin@example.com")).hasErrors()).isFalse();
    }

    @Test
    @DisplayName("isCauseOf recognises our rejection inside Spring's bearer-token exception")
    void isCauseOf_detectsAnonymousRejection() {
        OAuth2Error ours = new OAuth2Error(NotAnonymousJwtValidator.ERROR_CODE);
        Exception wrapped = new InvalidBearerTokenException("invalid",
                new JwtValidationException("invalid", List.of(ours)));

        assertThat(NotAnonymousJwtValidator.isCauseOf(wrapped)).isTrue();
    }

    @Test
    @DisplayName("isCauseOf ignores unrelated token failures (e.g. expired)")
    void isCauseOf_ignoresOtherFailures() {
        OAuth2Error expired = new OAuth2Error("invalid_token", "Jwt expired", null);
        Exception wrapped = new InvalidBearerTokenException("invalid",
                new JwtValidationException("invalid", List.of(expired)));

        assertThat(NotAnonymousJwtValidator.isCauseOf(wrapped)).isFalse();
    }
}

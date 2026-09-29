package com.gala.otw_server.security;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidationException;

/**
 * Rejects Supabase anonymous sessions: OTW requires a registered account.
 * Fail-closed — a missing is_anonymous claim still needs a non-blank email,
 * since every supported login method (email/OTP, password) is email-based.
 */
public class NotAnonymousJwtValidator implements OAuth2TokenValidator<Jwt> {

    public static final String ERROR_CODE = "anonymous_not_allowed";

    private static final OAuth2Error ERROR =
            new OAuth2Error(ERROR_CODE, "A registered account is required", null);

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        boolean anonymous = Boolean.TRUE.equals(jwt.getClaim("is_anonymous"));
        String email = jwt.getClaimAsString("email");
        if (anonymous || email == null || email.isBlank()) {
            return OAuth2TokenValidatorResult.failure(ERROR);
        }
        return OAuth2TokenValidatorResult.success();
    }

    /** True if an authentication failure was caused by this validator's rejection. */
    public static boolean isCauseOf(Throwable ex) {
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t instanceof JwtValidationException jve) {
                return jve.getErrors().stream()
                        .anyMatch(e -> ERROR_CODE.equals(e.getErrorCode()));
            }
        }
        return false;
    }
}

package com.gala.otw_server.security;

import java.util.Map;
import java.util.UUID;

/**
 * Represents the authenticated Supabase user extracted from the verified JWT.
 */
public record SupabaseUser(
        UUID id,
        String email,
        String role,
        boolean isAnonymous,
        Map<String, Object> userMetadata,
        Map<String, Object> appMetadata
) {
    public static SupabaseUser fromJwt(org.springframework.security.oauth2.jwt.Jwt jwt) {
        UUID id = UUID.fromString(jwt.getSubject());
        String email = jwt.getClaimAsString("email");
        String role = jwt.getClaimAsString("role");
        Boolean isAnon = jwt.getClaim("is_anonymous");

        Map<String, Object> userMeta = jwt.getClaim("user_metadata");
        Map<String, Object> appMeta = jwt.getClaim("app_metadata");

        return new SupabaseUser(
                id,
                email,
                role != null ? role : "authenticated",
                Boolean.TRUE.equals(isAnon),
                userMeta != null ? userMeta : Map.of(),
                appMeta != null ? appMeta : Map.of()
        );
    }
}

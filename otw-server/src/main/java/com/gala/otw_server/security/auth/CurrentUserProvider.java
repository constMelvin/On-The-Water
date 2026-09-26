package com.gala.otw_server.security.auth;

import com.gala.otw_server.common.DomainExceptions.UnauthenticatedException;
import com.gala.otw_server.security.SupabaseAuthenticationToken;
import com.gala.otw_server.security.SupabaseUser;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Single access point for "who is the current caller?"
 *
 * <p>Controllers and services call this instead of reaching into
 * {@link SecurityContextHolder} directly, so the extraction logic
 * is tested and changed in one place.
 */
@Component
public class CurrentUserProvider {

    /**
     * Returns the authenticated user's UUID (Supabase {@code auth.users.id}).
     *
     * @throws UnauthenticatedException if there is no authenticated principal in the context
     */
    public UUID getUserId() {
        return getUser().id();
    }

    /**
     * Returns the full {@link SupabaseUser} record from the verified JWT.
     *
     * @throws UnauthenticatedException if there is no authenticated principal in the context
     */
    public SupabaseUser getUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof SupabaseAuthenticationToken token) {
            return token.getPrincipal();
        }
        throw new UnauthenticatedException();
    }
}

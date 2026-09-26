package com.gala.otw_server.security;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Collection;

public class SupabaseAuthenticationToken extends AbstractAuthenticationToken {

    private final SupabaseUser principal;
    private final Jwt token;

    public SupabaseAuthenticationToken(SupabaseUser principal, Jwt token, Collection<? extends GrantedAuthority> authorities) {
        super(authorities);
        this.principal = principal;
        this.token = token;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return token.getTokenValue();
    }

    @Override
    public SupabaseUser getPrincipal() {
        return principal;
    }

    public Jwt getToken() {
        return token;
    }
}

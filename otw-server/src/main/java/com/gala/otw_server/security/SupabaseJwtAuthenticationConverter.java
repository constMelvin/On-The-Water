package com.gala.otw_server.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class SupabaseJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        SupabaseUser user = SupabaseUser.fromJwt(jwt);

        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        if (user.role() != null && !user.role().isBlank()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + user.role().toUpperCase()));
        } else {
            authorities.add(new SimpleGrantedAuthority("ROLE_AUTHENTICATED"));
        }

        return new SupabaseAuthenticationToken(user, jwt, authorities);
    }
}

package com.gala.otw_server.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gala.otw_server.common.ErrorCode;
import com.gala.otw_server.common.ErrorResponse;
import com.gala.otw_server.ratelimit.RateLimitFilter;
import com.gala.otw_server.ratelimit.RateLimiterService;
import com.gala.otw_server.security.AccountRequiredFilter;
import com.gala.otw_server.security.SupabaseJwtAuthenticationConverter;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}")
    private String jwkSetUri;

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    private String issuerUri;

    @Value("${supabase.jwt-audience:authenticated}")
    private String expectedAudience;

    private final SupabaseJwtAuthenticationConverter supabaseJwtConverter;
    private final CorsConfigurationSource corsConfigurationSource;
    private final ObjectMapper objectMapper;
    private final ObjectProvider<RateLimiterService> rateLimiterService;

    public SecurityConfig(
            SupabaseJwtAuthenticationConverter supabaseJwtConverter,
            CorsConfigurationSource corsConfigurationSource,
            ObjectMapper objectMapper,
            ObjectProvider<RateLimiterService> rateLimiterService) {
        this.supabaseJwtConverter = supabaseJwtConverter;
        this.corsConfigurationSource = corsConfigurationSource;
        this.objectMapper = objectMapper;
        this.rateLimiterService = rateLimiterService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(AbstractHttpConfigurer::disable)
                .headers(headers -> headers
                        .frameOptions(HeadersConfigurer.FrameOptionsConfig::deny)
                        .contentTypeOptions(contentType -> {})
                        .referrerPolicy(referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
                        .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
                        .permissionsPolicy(permissions -> permissions.policy("camera=(), microphone=(), payment=(), usb=()"))
                )
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                        .requestMatchers("/api/v1/public/**").permitAll()
                        .requestMatchers(
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/v3/api-docs.yaml"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                                .decoder(jwtDecoder())
                                .jwtAuthenticationConverter(supabaseJwtConverter))
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(401);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            objectMapper.writeValue(response.getWriter(),
                                    ErrorResponse.of(ErrorCode.UNAUTHENTICATED, "Invalid or missing token"));
                        })
                )
                .exceptionHandling(ex -> ex
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(403);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            objectMapper.writeValue(response.getWriter(),
                                    ErrorResponse.of(ErrorCode.FORBIDDEN, "Access denied"));
                        })
                )
                // Account gate right after the JWT is verified, then per-user rate limits (so
                // anonymous traffic never consumes budget), both after CORS (429/401 keep
                // Access-Control-Allow-Origin). See AccountRequiredFilter and RateLimitFilter.
                .addFilterAfter(new AccountRequiredFilter(objectMapper), BearerTokenAuthenticationFilter.class)
                .addFilterAfter(new RateLimitFilter(rateLimiterService.getIfAvailable(), objectMapper),
                        AccountRequiredFilter.class);

        return http.build();
    }

    /**
     * JWT decoder with explicit issuer + audience validation on top of the
     * default signature/expiry checks provided by Spring Security.
     *
     * <p>Spring's {@code NimbusJwtDecoder} automatically handles JWKS fetching,
     * caching, and key rotation — we only add our custom validators on top.
     */
    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri)
                .jwsAlgorithms(algorithms -> {
                    algorithms.add(SignatureAlgorithm.RS256);
                    algorithms.add(SignatureAlgorithm.ES256);
                })
                .build();

        // Default validator checks exp, iat, nbf, and issuer
        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(issuerUri);

        // Explicit audience check — rejects tokens from a different Supabase project
        OAuth2TokenValidator<Jwt> withAudience = jwt -> {
            var audience = jwt.getAudience();
            if (audience != null && audience.contains(expectedAudience)) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_audience", "JWT audience mismatch", null));
        };

        // Anonymous Supabase tokens still pass signature/iss/aud here; AccountRequiredFilter then
        // rejects them with 401 ACCOUNT_REQUIRED on every protected route.
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(withIssuer, withAudience));
        return decoder;
    }
}

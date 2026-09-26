package com.gala.otw_server.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "supabase")
@Getter
@Setter
public class SupabaseProperties {

    /**
     * Supabase project URL (e.g. https://xyzcompany.supabase.co)
     */
    private String url;

    /**
     * Expected JWT audience claim value — must match what Supabase issues.
     * Default: "authenticated" (the value Supabase uses for logged-in users).
     */
    private String jwtAudience = "authenticated";

    /**
     * Public anonymous key
     */
    private String anonKey;

    /**
     * Backend service role secret key
     */
    private String serviceRoleKey;
}


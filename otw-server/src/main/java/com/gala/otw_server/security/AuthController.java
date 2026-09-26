package com.gala.otw_server.security;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class AuthController {

    /**
     * Public test endpoint to verify server is reachable without authentication.
     */
    @GetMapping("/public/ping")
    public ResponseEntity<Map<String, String>> ping() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "message", "OTW server is running"
        ));
    }

    /**
     * Protected endpoint to verify Supabase JWT token authentication.
     * Returns the verified identity and UUID extracted from the token.
     */
    @GetMapping("/auth/me")
    public ResponseEntity<SupabaseUser> getMe(@AuthenticationPrincipal SupabaseUser user) {
        return ResponseEntity.ok(user);
    }
}

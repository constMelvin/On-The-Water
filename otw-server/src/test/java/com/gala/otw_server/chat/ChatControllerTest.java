package com.gala.otw_server.chat;

import com.gala.otw_server.chat.controller.ChatController;
import com.gala.otw_server.chat.dto.ReactorDto;
import com.gala.otw_server.chat.entity.ReactionType;
import com.gala.otw_server.chat.service.ChatService;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.config.CorsConfig;
import com.gala.otw_server.config.SecurityConfig;
import com.gala.otw_server.ratelimit.RateLimiterService;
import com.gala.otw_server.security.SupabaseAuthenticationToken;
import com.gala.otw_server.security.SupabaseJwtAuthenticationConverter;
import com.gala.otw_server.security.SupabaseUser;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Web layer only: routing, parameter parsing and clamping. Service behaviour is in ChatServiceTest. */
@WebMvcTest(controllers = ChatController.class)
@Import({SecurityConfig.class, CorsConfig.class, SupabaseJwtAuthenticationConverter.class, CurrentUserProvider.class})
@TestPropertySource(properties = {
        "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://example.invalid/jwks.json",
        "spring.security.oauth2.resourceserver.jwt.issuer-uri=https://example.invalid",
        "app.cors.allowed-origins=http://localhost:3000"
})
@DisplayName("ChatController")
class ChatControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ChatService chatService;

    @MockitoBean
    private RateLimiterService rateLimiterService;

    private final UUID roomId = UUID.randomUUID();
    private final UUID messageId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void allowRateLimit() {
        lenient().when(rateLimiterService.tryAcquireCount(anyString(), anyInt(), any(Duration.class))).thenReturn(true);
    }

    private SupabaseAuthenticationToken member() {
        Jwt jwt = Jwt.withTokenValue("t").header("alg", "RS256").subject(userId.toString())
                .claim("is_anonymous", false).claim("email", "a@b.co").build();
        return new SupabaseAuthenticationToken(SupabaseUser.fromJwt(jwt), jwt, List.of());
    }

    @Test
    @DisplayName("GET /messages/{id}/reactions → 200, filtered by reaction, limit clamped to 100")
    void reactors_filteredAndClamped() throws Exception {
        UUID reactor = UUID.randomUUID();
        when(chatService.getReactors(roomId, messageId, ReactionType.HEART, null, 100))
                .thenReturn(PageResponse.last(List.of(new ReactorDto(reactor, ReactionType.HEART, OffsetDateTime.now())), 100));

        mockMvc.perform(get("/api/v1/rooms/{roomId}/chat/messages/{messageId}/reactions", roomId, messageId)
                        .param("reaction", "HEART").param("limit", "500")
                        .with(authentication(member())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].userId").value(reactor.toString()))
                .andExpect(jsonPath("$.items[0].reaction").value("HEART"));

        verify(chatService).getReactors(roomId, messageId, ReactionType.HEART, null, 100);
    }

    @Test
    @DisplayName("GET /messages/{id}/reactions with an unknown reaction → 400")
    void reactors_badReaction() throws Exception {
        mockMvc.perform(get("/api/v1/rooms/{roomId}/chat/messages/{messageId}/reactions", roomId, messageId)
                        .param("reaction", "NOPE")
                        .with(authentication(member())))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(chatService);
    }
}

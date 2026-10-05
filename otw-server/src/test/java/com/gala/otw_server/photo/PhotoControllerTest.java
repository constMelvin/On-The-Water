package com.gala.otw_server.photo;

import com.gala.otw_server.common.DomainExceptions.InvalidPhotoReferenceException;
import com.gala.otw_server.common.ErrorCode;
import com.gala.otw_server.config.CorsConfig;
import com.gala.otw_server.config.SecurityConfig;
import com.gala.otw_server.photo.controller.PhotoController;
import com.gala.otw_server.photo.dto.PhotoDto;
import com.gala.otw_server.photo.dto.RegisterPhotoRequest;
import com.gala.otw_server.photo.dto.StartUploadRequest;
import com.gala.otw_server.photo.dto.UploadSessionDto;
import com.gala.otw_server.photo.service.PhotoService;
import com.gala.otw_server.ratelimit.RateLimiterService;
import com.gala.otw_server.security.SupabaseAuthenticationToken;
import com.gala.otw_server.security.SupabaseJwtAuthenticationConverter;
import com.gala.otw_server.security.SupabaseUser;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Web layer only: routing, validation, auth and error shape. Service behaviour is in PhotoServiceTest. */
@WebMvcTest(controllers = PhotoController.class)
@Import({SecurityConfig.class, CorsConfig.class, SupabaseJwtAuthenticationConverter.class, CurrentUserProvider.class})
@TestPropertySource(properties = {
        "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://example.invalid/jwks.json",
        "spring.security.oauth2.resourceserver.jwt.issuer-uri=https://example.invalid",
        "app.cors.allowed-origins=http://localhost:3000"
})
@DisplayName("PhotoController")
class PhotoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PhotoService photoService;

    @MockBean
    private RateLimiterService rateLimiterService;

    private final UUID roomId = UUID.randomUUID();
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
    @DisplayName("POST /uploads → 201 with the upload URL; only an allowed Origin is passed on")
    void startUpload_created() throws Exception {
        when(photoService.startUpload(eq(roomId), eq(userId), any(StartUploadRequest.class), any()))
                .thenReturn(new UploadSessionDto("https://upload.example/s"));

        mockMvc.perform(post("/api/v1/rooms/{roomId}/photos/uploads", roomId)
                        .with(authentication(member()))
                        .header("Origin", "http://localhost:3000")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileName\":\"a.jpg\",\"mimeType\":\"image/jpeg\",\"size\":1000}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.uploadUrl").value("https://upload.example/s"));

        verify(photoService).startUpload(eq(roomId), eq(userId), any(), eq("http://localhost:3000"));
    }

    @Test
    @DisplayName("POST /uploads with a non-media type or a too-big file → 400 VALIDATION_ERROR")
    void startUpload_validation() throws Exception {
        for (String body : List.of(
                "{\"fileName\":\"a.pdf\",\"mimeType\":\"application/pdf\",\"size\":1000}",
                "{\"fileName\":\"a.mp4\",\"mimeType\":\"video/mp4\",\"size\":400000000}")) {
            mockMvc.perform(post("/api/v1/rooms/{roomId}/photos/uploads", roomId)
                            .with(authentication(member()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value(ErrorCode.VALIDATION_ERROR.name()));
        }
        verifyNoInteractions(photoService);
    }

    @Test
    @DisplayName("POST /photos → 201 with the saved metadata")
    void registerPhoto_created() throws Exception {
        UUID photoId = UUID.randomUUID();
        when(photoService.registerPhoto(eq(roomId), eq(userId), any(RegisterPhotoRequest.class)))
                .thenReturn(new PhotoDto(photoId, roomId, "drive-1", userId, null, "image/jpeg", "READY",
                        OffsetDateTime.parse("2026-10-05T12:00:00Z")));

        mockMvc.perform(post("/api/v1/rooms/{roomId}/photos", roomId)
                        .with(authentication(member()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"driveFileId\":\"drive-1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(photoId.toString()))
                .andExpect(jsonPath("$.driveFileId").value("drive-1"))
                .andExpect(jsonPath("$.status").value("READY"));
    }

    @Test
    @DisplayName("POST /photos with a bad Drive file → 400 INVALID_PHOTO_REFERENCE")
    void registerPhoto_invalidReference() throws Exception {
        when(photoService.registerPhoto(any(), any(), any())).thenThrow(new InvalidPhotoReferenceException());

        mockMvc.perform(post("/api/v1/rooms/{roomId}/photos", roomId)
                        .with(authentication(member()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"driveFileId\":\"nope\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_PHOTO_REFERENCE.name()));
    }

    @Test
    @DisplayName("DELETE /photos/{id} → 204")
    void deletePhoto_noContent() throws Exception {
        UUID photoId = UUID.randomUUID();

        mockMvc.perform(delete("/api/v1/rooms/{roomId}/photos/{photoId}", roomId, photoId)
                        .with(authentication(member())))
                .andExpect(status().isNoContent());

        verify(photoService).deletePhoto(roomId, photoId, userId);
    }

    @Test
    @DisplayName("no token → 401 UNAUTHENTICATED and the service is never called")
    void noToken_unauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/rooms/{roomId}/photos/uploads", roomId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileName\":\"a.jpg\",\"mimeType\":\"image/jpeg\",\"size\":1000}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(ErrorCode.UNAUTHENTICATED.name()));
        verifyNoInteractions(photoService);
    }
}

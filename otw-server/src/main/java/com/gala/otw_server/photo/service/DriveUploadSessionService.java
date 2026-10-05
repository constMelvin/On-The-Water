package com.gala.otw_server.photo.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;
import com.google.auth.oauth2.GoogleCredentials;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Opens a Google Drive resumable-upload session in a gala's folder with the backend's Drive
 * credentials and returns its one-time upload URL. The browser PUTs the file bytes straight to
 * that URL (no Google sign-in for the uploader); the bytes never pass through this server.
 */
@Service
public class DriveUploadSessionService {

    private static final Logger log = LoggerFactory.getLogger(DriveUploadSessionService.class);
    private static final String UPLOAD_URL =
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,mimeType";

    private final GoogleCredentials credentials;
    private final ObjectMapper objectMapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public DriveUploadSessionService(@Autowired(required = false) @Nullable GoogleCredentials credentials,
                                     ObjectMapper objectMapper) {
        this.credentials = credentials;
        this.objectMapper = objectMapper;
    }

    /**
     * @param origin the browser's origin (already checked against the CORS allow-list), so Google
     *               lets that page PUT to the session URL; null when not called from a browser
     */
    public String openSession(String folderId, String fileName, String mimeType, long size, @Nullable String origin) {
        if (credentials == null) {
            throw new InvalidRequestException("Photo uploads aren't set up on the server yet.");
        }
        try {
            credentials.refreshIfExpired();
            String token = credentials.getAccessToken().getTokenValue();
            String body = objectMapper.writeValueAsString(Map.of("name", fileName, "parents", List.of(folderId)));

            HttpRequest.Builder req = HttpRequest.newBuilder(URI.create(UPLOAD_URL))
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json; charset=UTF-8")
                    .header("X-Upload-Content-Type", mimeType)
                    .header("X-Upload-Content-Length", String.valueOf(size))
                    .POST(HttpRequest.BodyPublishers.ofString(body));
            if (origin != null) req.header("Origin", origin);

            // Each attempt opens a fresh session, so retrying a 429/5xx is harmless.
            HttpRequest built = req.build();
            HttpResponse<String> res = http.send(built, HttpResponse.BodyHandlers.ofString());
            for (int attempt = 1; attempt < DriveRetry.MAX_ATTEMPTS && DriveRetry.isRetryableStatus(res.statusCode()); attempt++) {
                log.info("Drive upload session got HTTP {} (attempt {}), retrying", res.statusCode(), attempt);
                DriveRetry.pause(attempt);
                res = http.send(built, HttpResponse.BodyHandlers.ofString());
            }
            String location = res.headers().firstValue("Location").orElse(null);
            if (res.statusCode() / 100 != 2 || location == null) {
                log.warn("Drive refused an upload session in folder {}: HTTP {} {}", folderId, res.statusCode(),
                        res.body().length() > 500 ? res.body().substring(0, 500) : res.body());
                throw new InvalidRequestException(res.body().contains("storageQuotaExceeded")
                        ? "The gala's Google Drive is out of storage (or the server signs in as a service account " +
                          "outside a Shared Drive)."
                        : "Couldn't start the upload. Try again in a moment.");
            }
            return location;
        } catch (IOException ex) {
            log.warn("Couldn't open a Drive upload session: {}", ex.getMessage());
            throw new InvalidRequestException("Couldn't start the upload. Try again in a moment.");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new InvalidRequestException("Couldn't start the upload. Try again in a moment.");
        }
    }
}

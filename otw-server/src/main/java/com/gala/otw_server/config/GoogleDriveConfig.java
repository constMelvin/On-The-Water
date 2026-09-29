package com.gala.otw_server.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.util.Base64;
import java.util.List;

/**
 * Read-only Google Drive API client for verifying a client-supplied
 * driveFileId (see GoogleDriveFileValidator) — the backend never uploads or
 * downloads photo binaries, only checks metadata on a file the client
 * already put in Drive itself.
 *
 * <p>Returns {@code null} (no bean) when credentials aren't configured, e.g.
 * local dev without Drive secrets — GoogleDriveFileValidator treats a null
 * client as "not configured" and fails closed at validation time rather than
 * failing the whole application context at startup.
 */
@Configuration
public class GoogleDriveConfig {

    private static final Logger log = LoggerFactory.getLogger(GoogleDriveConfig.class);

    @Bean
    public Drive googleDriveClient(
            @Value("${google.drive.credentials-json-base64:}") String credentialsJsonBase64,
            @Value("${google.drive.application-name:OTW}") String applicationName) {
        if (credentialsJsonBase64 == null || credentialsJsonBase64.isBlank()) {
            log.warn("GOOGLE_DRIVE_CREDENTIALS_JSON_BASE64 is not set — Google Drive photo " +
                    "validation is disabled; photo registration will fail closed.");
            return null;
        }

        try {
            byte[] credentialsJson = Base64.getDecoder().decode(credentialsJsonBase64);
            GoogleCredentials credentials = GoogleCredentials
                    .fromStream(new ByteArrayInputStream(credentialsJson))
                    .createScoped(List.of(DriveScopes.DRIVE_METADATA_READONLY));

            return new Drive.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance(),
                    new HttpCredentialsAdapter(credentials))
                    .setApplicationName(applicationName)
                    .build();
        } catch (Exception ex) {
            log.error("Failed to initialize the Google Drive client from " +
                    "GOOGLE_DRIVE_CREDENTIALS_JSON_BASE64 — photo registration will fail closed.", ex);
            return null;
        }
    }
}

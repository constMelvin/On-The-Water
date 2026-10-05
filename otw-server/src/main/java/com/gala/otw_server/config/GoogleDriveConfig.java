package com.gala.otw_server.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.UserCredentials;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.Nullable;

import java.io.ByteArrayInputStream;
import java.util.Base64;
import java.util.List;

/**
 * Google Drive access for the Gala Dump. Two ways to sign in, first match wins:
 *
 * <ol>
 *   <li><b>The owner's Google account</b> (GOOGLE_DRIVE_OAUTH_CLIENT_ID / _SECRET /
 *       GOOGLE_DRIVE_REFRESH_TOKEN): for a normal Gmail Drive. Gala folders and uploaded files
 *       belong to that account and use its storage, and nobody else signs in to Google.</li>
 *   <li><b>A service account</b> (GOOGLE_DRIVE_CREDENTIALS_JSON_BASE64): only works for uploads
 *       when the photos folder is in a Shared Drive (service accounts have no storage of their own).</li>
 * </ol>
 *
 * The backend never reads or stores photo bytes: it creates folders, opens one-time upload links
 * the browser sends the file to, and checks the result.
 */
@Configuration
public class GoogleDriveConfig {

    private static final Logger log = LoggerFactory.getLogger(GoogleDriveConfig.class);

    @Bean
    public GoogleCredentials googleDriveCredentials(
            @Value("${google.drive.oauth-client-id:}") String clientId,
            @Value("${google.drive.oauth-client-secret:}") String clientSecret,
            @Value("${google.drive.refresh-token:}") String refreshToken,
            @Value("${google.drive.credentials-json-base64:}") String credentialsJsonBase64) {
        try {
            if (!refreshToken.isBlank() && !clientId.isBlank() && !clientSecret.isBlank()) {
                log.info("Google Drive: using the owner's Google account (refresh token).");
                // The scope was fixed when the refresh token was issued (see docs: drive).
                return UserCredentials.newBuilder()
                        .setClientId(clientId)
                        .setClientSecret(clientSecret)
                        .setRefreshToken(refreshToken)
                        .build();
            }
            if (!credentialsJsonBase64.isBlank()) {
                log.info("Google Drive: using the service account (uploads need a Shared Drive folder).");
                byte[] json = Base64.getDecoder().decode(credentialsJsonBase64);
                return GoogleCredentials.fromStream(new ByteArrayInputStream(json))
                        .createScoped(List.of(DriveScopes.DRIVE_METADATA_READONLY, DriveScopes.DRIVE_FILE));
            }
        } catch (Exception ex) {
            log.error("Google Drive credentials are invalid — photo uploads will fail closed.", ex);
            return null;
        }
        log.warn("Google Drive is not configured (set GOOGLE_DRIVE_REFRESH_TOKEN + OAuth client, or " +
                "GOOGLE_DRIVE_CREDENTIALS_JSON_BASE64) — photo uploads will fail closed.");
        return null;
    }

    @Bean
    public Drive googleDriveClient(
            @Autowired(required = false) @Nullable GoogleCredentials googleDriveCredentials,
            @Value("${google.drive.application-name:OTW}") String applicationName) {
        if (googleDriveCredentials == null) return null;
        try {
            return new Drive.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance(),
                    new HttpCredentialsAdapter(googleDriveCredentials))
                    .setApplicationName(applicationName)
                    .build();
        } catch (Exception ex) {
            log.error("Failed to build the Google Drive client — photo uploads will fail closed.", ex);
            return null;
        }
    }
}

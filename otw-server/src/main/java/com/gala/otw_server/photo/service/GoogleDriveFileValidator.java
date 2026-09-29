package com.gala.otw_server.photo.service;

import com.gala.otw_server.common.DomainExceptions.InvalidPhotoReferenceException;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Verifies a client-supplied Google Drive file ID before PhotoService marks
 * it READY: the file must exist, not be trashed, be an image or video, and
 * live in the shared folder this backend expects. Metadata-only (Drive
 * files.get) — the backend never downloads or stores the binary itself.
 *
 * <p>Fails closed: if the Drive client isn't configured (see
 * {@link com.gala.otw_server.config.GoogleDriveConfig}), the folder ID isn't
 * configured, or the Drive API call itself fails, registration is rejected
 * rather than silently accepted.
 */
@Component
public class GoogleDriveFileValidator {

    private static final Logger log = LoggerFactory.getLogger(GoogleDriveFileValidator.class);

    private final Drive drive;
    private final String expectedFolderId;

    public GoogleDriveFileValidator(
            @Autowired(required = false) @Nullable Drive drive,
            @Value("${google.drive.photos-folder-id:}") String expectedFolderId) {
        this.drive = drive;
        this.expectedFolderId = expectedFolderId;
    }

    public void validate(String driveFileId) {
        if (drive == null || expectedFolderId.isBlank()) {
            log.error("Google Drive is not configured (GOOGLE_DRIVE_CREDENTIALS_JSON_BASE64 / " +
                    "GOOGLE_DRIVE_PHOTOS_FOLDER_ID) — rejecting photo registration fail-closed.");
            throw new InvalidPhotoReferenceException();
        }

        File file;
        try {
            file = drive.files().get(driveFileId)
                    .setFields("id, mimeType, parents, trashed")
                    .setSupportsAllDrives(true)
                    .execute();
        } catch (IOException ex) {
            log.warn("Google Drive lookup failed for file {}: {}", driveFileId, ex.getMessage());
            throw new InvalidPhotoReferenceException();
        }

        if (!isValidMediaFile(file)) {
            log.warn("Rejected Drive file {}: mimeType={}, parents={}, trashed={}, expectedFolder={}",
                    driveFileId, file.getMimeType(), file.getParents(), file.getTrashed(), expectedFolderId);
            throw new InvalidPhotoReferenceException();
        }
    }

    private boolean isValidMediaFile(File file) {
        return file != null
                && !Boolean.TRUE.equals(file.getTrashed())
                && file.getMimeType() != null
                && (file.getMimeType().startsWith("image/") || file.getMimeType().startsWith("video/"))
                && file.getParents() != null
                && file.getParents().contains(expectedFolderId);
    }
}

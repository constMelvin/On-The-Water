package com.gala.otw_server.profile.service;

import com.gala.otw_server.common.DomainExceptions.InvalidPhotoReferenceException;
import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;
import com.gala.otw_server.photo.service.DriveRetry;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * The one "OTW Profile Photos" Drive folder every account's profile photo goes in, inside
 * GOOGLE_DRIVE_PHOTOS_FOLDER_ID. Found by name (or created) on first use and remembered for the
 * life of the process, so no table holds its id. Files are named {@code profile-<userId>-<millis>.<ext>}
 * by the server, which is how {@link #checkOwnPhoto} knows a file belongs to the caller.
 * The backend never reads or stores the photo bytes.
 */
@Service
public class ProfilePhotoDriveService {

    private static final Logger log = LoggerFactory.getLogger(ProfilePhotoDriveService.class);
    static final String FOLDER_NAME = "OTW Profile Photos";
    private static final String FOLDER_MIME = "application/vnd.google-apps.folder";
    private static final Pattern DRIVE_ID = Pattern.compile("^[A-Za-z0-9_-]{1,200}$");
    private static final Map<String, String> EXTENSIONS =
            Map.of("image/webp", "webp", "image/jpeg", "jpg", "image/png", "png");

    private final Drive drive;
    private final String rootFolderId;
    private volatile String folderId;

    public ProfilePhotoDriveService(@Autowired(required = false) @Nullable Drive drive,
                                    @Value("${google.drive.photos-folder-id:}") String rootFolderId) {
        this.drive = drive;
        this.rootFolderId = rootFolderId;
    }

    public boolean isConfigured() {
        return drive != null && DRIVE_ID.matcher(rootFolderId).matches();
    }

    /** The shared profile-photo folder's id, finding or creating it first if needed. */
    public synchronized String ensureFolder() {
        if (folderId != null) return folderId;
        if (!isConfigured()) {
            throw new InvalidRequestException("Photo uploads aren't set up on the server yet.");
        }
        try {
            String query = "name = '" + FOLDER_NAME + "' and '" + rootFolderId + "' in parents"
                    + " and mimeType = '" + FOLDER_MIME + "' and trashed = false";
            FileList found = DriveRetry.call(() -> drive.files().list()
                    .setQ(query)
                    .setOrderBy("createdTime")
                    .setFields("files(id)")
                    .setPageSize(1)
                    .setSupportsAllDrives(true)
                    .setIncludeItemsFromAllDrives(true)
                    .execute());
            if (found.getFiles() != null && !found.getFiles().isEmpty()) {
                folderId = found.getFiles().get(0).getId();
                return folderId;
            }
            // Not retried: a retry after a timeout could leave a duplicate folder.
            File created = drive.files().create(new File()
                            .setName(FOLDER_NAME)
                            .setMimeType(FOLDER_MIME)
                            .setParents(List.of(rootFolderId)))
                    .setFields("id")
                    .setSupportsAllDrives(true)
                    .execute();
            log.info("Drive folder {} created for profile photos", created.getId());
            folderId = created.getId();
            return folderId;
        } catch (IOException ex) {
            log.warn("Couldn't find or create the profile photo Drive folder: {}", ex.getMessage());
            throw new InvalidRequestException("Couldn't set up the profile photo folder. Try again in a moment.");
        }
    }

    /** "profile-<userId>-<millis>.webp": the prefix ties the file to its account. */
    static String fileName(UUID userId, String mimeType, long millis) {
        return ownerPrefix(userId) + millis + "." + EXTENSIONS.getOrDefault(mimeType, "jpg");
    }

    private static String ownerPrefix(UUID userId) {
        return "profile-" + userId + "-";
    }

    /**
     * Checks the file is a non-trashed WebP/JPEG/PNG in the profile folder, uploaded for this
     * account (server-chosen name). Fails closed: no Drive, or a failed lookup, rejects it.
     */
    public void checkOwnPhoto(String driveFileId, UUID userId) {
        if (!isConfigured()) {
            log.error("Google Drive is not configured — rejecting the profile photo fail-closed.");
            throw new InvalidPhotoReferenceException();
        }
        String folder = ensureFolder();
        File file;
        try {
            file = DriveRetry.call(() -> drive.files().get(driveFileId)
                    .setFields("id, name, mimeType, parents, trashed")
                    .setSupportsAllDrives(true)
                    .execute());
        } catch (IOException ex) {
            log.warn("Google Drive lookup failed for profile photo {}: {}", driveFileId, ex.getMessage());
            throw new InvalidPhotoReferenceException();
        }
        boolean ok = file != null
                && !Boolean.TRUE.equals(file.getTrashed())
                && file.getMimeType() != null && EXTENSIONS.containsKey(file.getMimeType())
                && file.getParents() != null && file.getParents().contains(folder)
                && file.getName() != null && file.getName().startsWith(ownerPrefix(userId));
        if (!ok) {
            log.warn("Rejected profile photo {} for user {}: name={}, mimeType={}, parents={}, trashed={}",
                    driveFileId, userId, file == null ? null : file.getName(), file == null ? null : file.getMimeType(),
                    file == null ? null : file.getParents(), file == null ? null : file.getTrashed());
            throw new InvalidPhotoReferenceException();
        }
    }
}

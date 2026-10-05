package com.gala.otw_server.photo.service;

import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;
import com.gala.otw_server.common.DomainExceptions.RoomNotFoundException;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.repository.RoomRepository;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.Permission;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * One Google Drive folder per gala for the Gala Dump, inside GOOGLE_DRIVE_PHOTOS_FOLDER_ID,
 * named "<title> · OTW-XXXX-XXXX", created with the backend's Drive sign-in (the owner's Google
 * account, or a service account in a Shared Drive). The backend never reads or stores photo bytes.
 * Folder creation is not retried: a retry after a timeout could leave a duplicate folder.
 *
 * Created right after Plan a Gala commits; galas from before this (or a failed Drive call)
 * get theirs on the first upload via {@link #ensureFolder(UUID)}.
 */
@Service
public class GalaDriveFolderService {

    private static final Logger log = LoggerFactory.getLogger(GalaDriveFolderService.class);
    private static final String FOLDER_MIME = "application/vnd.google-apps.folder";

    private final Drive drive;
    private final String rootFolderId;
    private final RoomRepository roomRepo;
    private final JdbcTemplate jdbc;

    public GalaDriveFolderService(@Autowired(required = false) @Nullable Drive drive,
                                  @Value("${google.drive.photos-folder-id:}") String rootFolderId,
                                  RoomRepository roomRepo,
                                  JdbcTemplate jdbc) {
        this.drive = drive;
        this.rootFolderId = rootFolderId;
        this.roomRepo = roomRepo;
        this.jdbc = jdbc;
    }

    public boolean isConfigured() {
        return drive != null && !rootFolderId.isBlank();
    }

    /** The gala's folder id, creating the folder first if it has none yet. */
    public String ensureFolder(UUID roomId) {
        Room room = roomRepo.findById(roomId).orElseThrow(RoomNotFoundException::new);
        if (room.getDriveFolderId() != null) return room.getDriveFolderId();
        if (!isConfigured()) {
            throw new InvalidRequestException("Photo uploads aren't set up on the server yet.");
        }

        String created;
        try {
            File folder = drive.files().create(new File()
                            .setName(folderName(room))
                            .setMimeType(FOLDER_MIME)
                            .setParents(List.of(rootFolderId)))
                    .setFields("id")
                    .setSupportsAllDrives(true)
                    .execute();
            created = folder.getId();
        } catch (IOException ex) {
            log.warn("Couldn't create the Drive folder for room {}: {}", roomId, ex.getMessage());
            throw new InvalidRequestException("Couldn't set up this gala's photo folder. Try again in a moment.");
        }

        // Two first uploads can race: only the first folder sticks; the extra one is removed.
        int won = jdbc.update("UPDATE rooms SET drive_folder_id = ? WHERE id = ? AND drive_folder_id IS NULL",
                created, roomId);
        if (won == 1) {
            log.info("Drive folder {} created for room {}", created, roomId);
            return created;
        }
        try {
            drive.files().delete(created).setSupportsAllDrives(true).execute();
        } catch (IOException ex) {
            log.warn("Couldn't remove the extra Drive folder {}: {}", created, ex.getMessage());
        }
        return jdbc.queryForObject("SELECT drive_folder_id FROM rooms WHERE id = ?", String.class, roomId);
    }

    /**
     * Lets anyone with the file's link view it, so every member's browser can load the thumbnail
     * and the video player. Failures are logged: the photo is still saved.
     */
    public void makeLinkViewable(String fileId) {
        if (drive == null) return;
        try {
            DriveRetry.call(() -> drive.permissions()
                    .create(fileId, new Permission().setType("anyone").setRole("reader"))
                    .setSupportsAllDrives(true)
                    .execute());
        } catch (IOException ex) {
            log.warn("Couldn't make Drive file {} viewable by link: {}", fileId, ex.getMessage());
        }
    }

    /**
     * Moves a Drive file to the trash (Drive empties it after 30 days, so a mistake can still be
     * undone). Returns false and logs on failure: the orphan sweep tries again later.
     */
    public boolean trashFile(String fileId) {
        if (drive == null) return false;
        try {
            DriveRetry.call(() -> drive.files().update(fileId, new File().setTrashed(true))
                    .setSupportsAllDrives(true)
                    .execute());
            return true;
        } catch (IOException ex) {
            log.warn("Couldn't trash Drive file {}: {}", fileId, ex.getMessage());
            return false;
        }
    }

    /** "Baguio Before Graduation · OTW-7K2P-ABCD" */
    static String folderName(Room room) {
        String code = room.getRoomCode();
        String pretty = code != null && code.length() == 8
                ? "OTW-" + code.substring(0, 4) + "-" + code.substring(4)
                : String.valueOf(code);
        String title = room.getTitle() == null ? "Gala" : room.getTitle().replaceAll("[\\r\\n/\\\\]+", " ").trim();
        return title + " · " + pretty;
    }
}

package com.gala.otw_server.photo.service;

import com.gala.otw_server.photo.repository.PhotoRepository;
import com.google.api.client.util.DateTime;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.lang.Nullable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.TimeZone;
import java.util.regex.Pattern;

/**
 * Trashes Drive files in gala folders that have no {@code photos} row: uploads whose register call
 * never came (or failed), and files whose photo was deleted but whose trash call failed. Only files
 * older than {@code google.drive.orphan-sweep.min-age} count, so an upload in progress is never touched.
 *
 * <p>Only lists inside each gala's own folder. A global files.list would cover the owner's whole
 * Drive when the backend signs in as the owner. Files are trashed, not deleted, so Drive keeps them
 * for 30 days.
 */
@Component
public class DriveOrphanSweeper {

    private static final Logger log = LoggerFactory.getLogger(DriveOrphanSweeper.class);
    private static final Pattern DRIVE_ID = Pattern.compile("^[A-Za-z0-9_-]{1,200}$");
    private static final int PAGE_SIZE = 100;
    static final int MAX_TRASHED_PER_RUN = 200;

    private final Drive drive;
    private final GalaDriveFolderService folders;
    private final PhotoRepository photoRepo;
    private final JdbcTemplate jdbc;
    private final Duration minAge;
    private final Clock clock;

    @Autowired
    public DriveOrphanSweeper(@Autowired(required = false) @Nullable Drive drive,
                              GalaDriveFolderService folders,
                              PhotoRepository photoRepo,
                              JdbcTemplate jdbc,
                              @Value("${google.drive.orphan-sweep.min-age:PT24H}") Duration minAge) {
        this(drive, folders, photoRepo, jdbc, minAge, Clock.systemUTC());
    }

    DriveOrphanSweeper(@Nullable Drive drive, GalaDriveFolderService folders, PhotoRepository photoRepo,
                       JdbcTemplate jdbc, Duration minAge, Clock clock) {
        this.drive = drive;
        this.folders = folders;
        this.photoRepo = photoRepo;
        this.jdbc = jdbc;
        this.minAge = minAge;
        this.clock = clock;
    }

    @Scheduled(cron = "${google.drive.orphan-sweep.cron:0 30 */6 * * *}", zone = "${otw.timezone:Asia/Manila}")
    public void sweep() {
        if (drive == null || !folders.isConfigured()) return;

        List<String> folderIds = jdbc.queryForList(
                "SELECT drive_folder_id FROM rooms WHERE drive_folder_id IS NOT NULL", String.class);
        DateTime cutoff = new DateTime(Date.from(clock.instant().minus(minAge)), TimeZone.getTimeZone("UTC"));
        int trashed = 0;
        for (String folderId : folderIds) {
            if (trashed >= MAX_TRASHED_PER_RUN) break;
            if (!DRIVE_ID.matcher(folderId).matches()) {
                log.warn("Skipping odd Drive folder id {}", folderId);
                continue;
            }
            try {
                trashed += sweepFolder(folderId, cutoff, MAX_TRASHED_PER_RUN - trashed);
            } catch (IOException ex) {
                log.warn("Orphan sweep couldn't list Drive folder {}: {}", folderId, ex.getMessage());
            }
        }
        if (trashed > 0) log.info("Orphan sweep trashed {} Drive file(s) with no photo row", trashed);
    }

    private int sweepFolder(String folderId, DateTime cutoff, int budget) throws IOException {
        String query = "'" + folderId + "' in parents and trashed = false"
                + " and mimeType != 'application/vnd.google-apps.folder'"
                + " and createdTime < '" + cutoff.toStringRfc3339() + "'";
        int trashed = 0;
        String pageToken = null;
        do {
            String token = pageToken;
            FileList page = DriveRetry.call(() -> drive.files().list()
                    .setQ(query)
                    .setFields("nextPageToken, files(id)")
                    .setPageSize(PAGE_SIZE)
                    .setPageToken(token)
                    .setSupportsAllDrives(true)
                    .setIncludeItemsFromAllDrives(true)
                    .execute());
            List<String> ids = page.getFiles() == null ? List.of()
                    : page.getFiles().stream().map(File::getId).toList();
            if (!ids.isEmpty()) {
                Set<String> known = photoRepo.findExistingDriveFileIds(ids);
                for (String id : ids) {
                    if (trashed >= budget) return trashed;
                    if (!known.contains(id) && folders.trashFile(id)) trashed++;
                }
            }
            pageToken = page.getNextPageToken();
        } while (pageToken != null);
        return trashed;
    }
}

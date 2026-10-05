package com.gala.otw_server.photo.service;

import com.gala.otw_server.photo.repository.PhotoRepository;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DriveOrphanSweeperTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-05T12:00:00Z"), ZoneOffset.UTC);

    private Drive drive;
    private Drive.Files files;
    private Drive.Files.List list;
    private GalaDriveFolderService folders;
    private PhotoRepository photoRepo;
    private JdbcTemplate jdbc;
    private DriveOrphanSweeper sweeper;

    @BeforeEach
    void setUp() throws IOException {
        drive = mock(Drive.class);
        files = mock(Drive.Files.class);
        list = mock(Drive.Files.List.class, RETURNS_SELF);
        when(drive.files()).thenReturn(files);
        when(files.list()).thenReturn(list);

        folders = mock(GalaDriveFolderService.class);
        when(folders.isConfigured()).thenReturn(true);
        when(folders.trashFile(anyString())).thenReturn(true);
        photoRepo = mock(PhotoRepository.class);
        jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForList(anyString(), eq(String.class))).thenReturn(List.of("galaFolder1"));

        sweeper = new DriveOrphanSweeper(drive, folders, photoRepo, jdbc, Duration.ofHours(24), CLOCK);
    }

    private static FileList page(String... ids) {
        return new FileList().setFiles(java.util.Arrays.stream(ids).map(id -> new File().setId(id)).toList());
    }

    @Test
    @DisplayName("trashes only files in the gala folder that have no photo row")
    void trashesOnlyOrphans() throws IOException {
        doReturn(page("kept", "orphan")).when(list).execute();
        when(photoRepo.findExistingDriveFileIds(List.of("kept", "orphan"))).thenReturn(Set.of("kept"));

        sweeper.sweep();

        verify(folders).trashFile("orphan");
        verify(folders, never()).trashFile("kept");
    }

    @Test
    @DisplayName("only asks Drive for that folder's files older than the minimum age")
    void queryIsScopedToFolderAndAge() throws IOException {
        doReturn(page()).when(list).execute();

        sweeper.sweep();

        ArgumentCaptor<String> q = ArgumentCaptor.forClass(String.class);
        verify(list).setQ(q.capture());
        assertThat(q.getValue())
                .contains("'galaFolder1' in parents")
                .contains("trashed = false")
                .contains("mimeType != 'application/vnd.google-apps.folder'")
                .contains("createdTime < '2026-10-04T12:00:00.000Z'");
        verify(list).setSupportsAllDrives(true);
        verify(list).setIncludeItemsFromAllDrives(true);
        verify(folders, never()).trashFile(anyString());
    }

    @Test
    @DisplayName("follows page tokens across pages")
    void followsPages() throws IOException {
        doReturn(page("a").setNextPageToken("next"), page("b")).when(list).execute();
        when(photoRepo.findExistingDriveFileIds(anyCollection())).thenReturn(Set.of());

        sweeper.sweep();

        verify(folders).trashFile("a");
        verify(folders).trashFile("b");
    }

    @Test
    @DisplayName("skips folder ids that don't look like Drive ids (no query injection)")
    void skipsOddFolderIds() {
        when(jdbc.queryForList(anyString(), eq(String.class))).thenReturn(List.of("x' or '1'='1"));

        sweeper.sweep();

        verifyNoInteractions(files);
    }

    @Test
    @DisplayName("does nothing when Drive isn't configured")
    void noopWhenNotConfigured() {
        new DriveOrphanSweeper(null, folders, photoRepo, jdbc, Duration.ofHours(24), CLOCK).sweep();

        verifyNoInteractions(jdbc, photoRepo);
    }
}

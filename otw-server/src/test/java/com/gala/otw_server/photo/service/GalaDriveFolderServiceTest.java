package com.gala.otw_server.photo.service;

import com.gala.otw_server.room.repository.RoomRepository;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class GalaDriveFolderServiceTest {

    private static final String FILE_ID = "file-xyz789";

    @Test
    @DisplayName("trashFile marks the file trashed with supportsAllDrives")
    void trashFile_trashesInAllDrives() throws IOException {
        Drive drive = mock(Drive.class);
        Drive.Files files = mock(Drive.Files.class);
        Drive.Files.Update update = mock(Drive.Files.Update.class);
        when(drive.files()).thenReturn(files);
        when(files.update(eq(FILE_ID), any(File.class))).thenReturn(update);
        when(update.setSupportsAllDrives(true)).thenReturn(update);

        GalaDriveFolderService service = new GalaDriveFolderService(
                drive, "root", mock(RoomRepository.class), mock(JdbcTemplate.class));

        assertThat(service.trashFile(FILE_ID)).isTrue();

        ArgumentCaptor<File> body = ArgumentCaptor.forClass(File.class);
        verify(files).update(eq(FILE_ID), body.capture());
        assertThat(body.getValue().getTrashed()).isTrue();
        verify(update).setSupportsAllDrives(true);
        verify(update).execute();
    }

    @Test
    @DisplayName("trashFile only logs and returns false when Drive fails")
    void trashFile_failureIsLoggedNotThrown() throws IOException {
        Drive drive = mock(Drive.class, RETURNS_DEEP_STUBS);
        when(drive.files().update(eq(FILE_ID), any(File.class)).setSupportsAllDrives(true).execute())
                .thenThrow(new IOException("Drive down"));

        GalaDriveFolderService service = new GalaDriveFolderService(
                drive, "root", mock(RoomRepository.class), mock(JdbcTemplate.class));

        assertThat(service.trashFile(FILE_ID)).isFalse();
    }

    @Test
    @DisplayName("trashFile is a no-op without a Drive client")
    void trashFile_noDrive() {
        GalaDriveFolderService service = new GalaDriveFolderService(
                null, "", mock(RoomRepository.class), mock(JdbcTemplate.class));

        assertThat(service.trashFile(FILE_ID)).isFalse();
    }
}

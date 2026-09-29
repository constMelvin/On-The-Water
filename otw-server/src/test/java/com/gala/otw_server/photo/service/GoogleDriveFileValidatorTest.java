package com.gala.otw_server.photo.service;

import com.gala.otw_server.common.DomainExceptions.InvalidPhotoReferenceException;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GoogleDriveFileValidatorTest {

    private static final String FOLDER_ID = "folder-abc123";
    private static final String FILE_ID = "file-xyz789";

    @Test
    @DisplayName("accepts an image file that lives in the expected folder and isn't trashed")
    void validate_acceptsImageInExpectedFolder() throws IOException {
        Drive drive = mock(Drive.class, RETURNS_DEEP_STUBS);
        File file = new File()
                .setMimeType("image/jpeg")
                .setParents(List.of(FOLDER_ID))
                .setTrashed(false);
        when(drive.files().get(FILE_ID).setFields(anyString()).setSupportsAllDrives(true).execute())
                .thenReturn(file);

        GoogleDriveFileValidator validator = new GoogleDriveFileValidator(drive, FOLDER_ID);

        assertThatCode(() -> validator.validate(FILE_ID)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("rejects a file that lives in a different folder")
    void validate_rejectsFileInWrongFolder() throws IOException {
        Drive drive = mock(Drive.class, RETURNS_DEEP_STUBS);
        File file = new File()
                .setMimeType("image/png")
                .setParents(List.of("some-other-folder"))
                .setTrashed(false);
        when(drive.files().get(FILE_ID).setFields(anyString()).setSupportsAllDrives(true).execute())
                .thenReturn(file);

        GoogleDriveFileValidator validator = new GoogleDriveFileValidator(drive, FOLDER_ID);

        assertThatThrownBy(() -> validator.validate(FILE_ID))
                .isInstanceOf(InvalidPhotoReferenceException.class);
    }

    @Test
    @DisplayName("rejects a non-image file")
    void validate_rejectsNonImageMimeType() throws IOException {
        Drive drive = mock(Drive.class, RETURNS_DEEP_STUBS);
        File file = new File()
                .setMimeType("application/pdf")
                .setParents(List.of(FOLDER_ID))
                .setTrashed(false);
        when(drive.files().get(FILE_ID).setFields(anyString()).setSupportsAllDrives(true).execute())
                .thenReturn(file);

        GoogleDriveFileValidator validator = new GoogleDriveFileValidator(drive, FOLDER_ID);

        assertThatThrownBy(() -> validator.validate(FILE_ID))
                .isInstanceOf(InvalidPhotoReferenceException.class);
    }

    @Test
    @DisplayName("rejects a trashed file")
    void validate_rejectsTrashedFile() throws IOException {
        Drive drive = mock(Drive.class, RETURNS_DEEP_STUBS);
        File file = new File()
                .setMimeType("image/jpeg")
                .setParents(List.of(FOLDER_ID))
                .setTrashed(true);
        when(drive.files().get(FILE_ID).setFields(anyString()).setSupportsAllDrives(true).execute())
                .thenReturn(file);

        GoogleDriveFileValidator validator = new GoogleDriveFileValidator(drive, FOLDER_ID);

        assertThatThrownBy(() -> validator.validate(FILE_ID))
                .isInstanceOf(InvalidPhotoReferenceException.class);
    }

    @Test
    @DisplayName("rejects when the Drive API call itself fails (e.g. file doesn't exist)")
    void validate_rejectsOnDriveApiFailure() throws IOException {
        Drive drive = mock(Drive.class, RETURNS_DEEP_STUBS);
        when(drive.files().get(FILE_ID).setFields(anyString()).setSupportsAllDrives(true).execute())
                .thenThrow(new IOException("404 Not Found"));

        GoogleDriveFileValidator validator = new GoogleDriveFileValidator(drive, FOLDER_ID);

        assertThatThrownBy(() -> validator.validate(FILE_ID))
                .isInstanceOf(InvalidPhotoReferenceException.class);
    }

    @Test
    @DisplayName("fails closed when the Drive client isn't configured (null)")
    void validate_failsClosedWhenDriveClientMissing() {
        GoogleDriveFileValidator validator = new GoogleDriveFileValidator(null, FOLDER_ID);

        assertThatThrownBy(() -> validator.validate(FILE_ID))
                .isInstanceOf(InvalidPhotoReferenceException.class);
    }

    @Test
    @DisplayName("fails closed when the expected folder ID isn't configured (blank)")
    void validate_failsClosedWhenFolderIdMissing() {
        Drive drive = mock(Drive.class, RETURNS_DEEP_STUBS);
        GoogleDriveFileValidator validator = new GoogleDriveFileValidator(drive, "");

        assertThatThrownBy(() -> validator.validate(FILE_ID))
                .isInstanceOf(InvalidPhotoReferenceException.class);
    }
}

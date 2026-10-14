package com.gala.otw_server.profile.service;

import com.gala.otw_server.common.DomainExceptions.InvalidPhotoReferenceException;
import com.gala.otw_server.common.DomainExceptions.TooManyRequestsException;
import com.gala.otw_server.photo.service.DriveUploadBudget;
import com.gala.otw_server.photo.service.DriveUploadSessionService;
import com.gala.otw_server.ratelimit.RateLimiterService;
import com.gala.otw_server.photo.service.GalaDriveFolderService;
import com.gala.otw_server.profile.dto.ProfileDto;
import com.gala.otw_server.profile.dto.StartProfilePhotoUploadRequest;
import com.gala.otw_server.profile.entity.UserProfile;
import com.gala.otw_server.profile.repository.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock private UserProfileRepository repo;
    @Mock private ProfilePhotoDriveService photoDrive;
    @Mock private DriveUploadSessionService uploads;
    @Mock private GalaDriveFolderService driveFiles;

    private ProfileService service;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.ofEpochMilli(1_700_000_000_000L), ZoneOffset.UTC);
        service = new ProfileService(repo, photoDrive, uploads, driveFiles,
                new DriveUploadBudget(new RateLimiterService(null)), clock);
    }

    @Test
    @DisplayName("never saved: an empty profile, not a 404")
    void emptyWhenAbsent() {
        when(repo.findById(userId)).thenReturn(Optional.empty());

        ProfileDto p = service.get(userId);

        assertThat(p.nickname()).isEmpty();
        assertThat(p.status()).isEmpty();
        assertThat(p.color()).isNull();
        assertThat(p.photoDriveFileId()).isNull();
    }

    @Test
    @DisplayName("update trims text, checks a new Drive photo is mine, makes it viewable, and saves only its id")
    void updateSaves() {
        when(repo.findById(userId)).thenReturn(Optional.empty());
        when(repo.save(any(UserProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        service.update(userId, new ProfileDto("  Mimi ", " late lang ", "teal", "file_123"));

        verify(photoDrive).checkOwnPhoto("file_123", userId);
        verify(driveFiles).makeLinkViewable("file_123");
        ArgumentCaptor<UserProfile> saved = ArgumentCaptor.forClass(UserProfile.class);
        verify(repo).save(saved.capture());
        assertThat(saved.getValue().getUserId()).isEqualTo(userId);
        assertThat(saved.getValue().getNickname()).isEqualTo("Mimi");
        assertThat(saved.getValue().getStatus()).isEqualTo("late lang");
        assertThat(saved.getValue().getColor()).isEqualTo("teal");
        assertThat(saved.getValue().getPhotoDriveFileId()).isEqualTo("file_123");
        verify(driveFiles, never()).trashFile(anyString());
    }

    @Test
    @DisplayName("same photo id again: no Drive calls")
    void unchangedPhotoSkipsDrive() {
        UserProfile existing = new UserProfile(userId);
        existing.setPhotoDriveFileId("file_123");
        when(repo.findById(userId)).thenReturn(Optional.of(existing));
        when(repo.save(any(UserProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        service.update(userId, new ProfileDto("Mimi", "", null, "file_123"));

        verifyNoInteractions(photoDrive, driveFiles);
    }

    @Test
    @DisplayName("a new photo trashes the old Drive file")
    void replacedPhotoTrashesOld() {
        UserProfile existing = new UserProfile(userId);
        existing.setPhotoDriveFileId("old_file");
        when(repo.findById(userId)).thenReturn(Optional.of(existing));
        when(repo.save(any(UserProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        service.update(userId, new ProfileDto("", "", null, "new_file"));

        verify(photoDrive).checkOwnPhoto("new_file", userId);
        verify(driveFiles).trashFile("old_file");
    }

    @Test
    @DisplayName("a blank photo clears it and trashes the old Drive file")
    void blankPhotoClears() {
        UserProfile existing = new UserProfile(userId);
        existing.setPhotoDriveFileId("old_file");
        when(repo.findById(userId)).thenReturn(Optional.of(existing));
        when(repo.save(any(UserProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        ProfileDto out = service.update(userId, new ProfileDto("", "", null, " "));

        assertThat(out.photoDriveFileId()).isNull();
        verify(photoDrive, never()).checkOwnPhoto(anyString(), any());
        verify(driveFiles).trashFile("old_file");
    }

    @Test
    @DisplayName("a Drive file that isn't my own profile photo is rejected and nothing is saved")
    void rejectsForeignPhoto() {
        when(repo.findById(userId)).thenReturn(Optional.empty());
        doThrow(new InvalidPhotoReferenceException()).when(photoDrive).checkOwnPhoto("someone_else", userId);

        assertThatThrownBy(() -> service.update(userId, new ProfileDto("", "", null, "someone_else")))
                .isInstanceOf(InvalidPhotoReferenceException.class);
        verify(repo, never()).save(any());
        verify(driveFiles, never()).makeLinkViewable(anyString());
    }

    @Test
    @DisplayName("upload session: in the profile folder, file named after the caller")
    void startPhotoUploadNamesFileForCaller() {
        when(photoDrive.ensureFolder()).thenReturn("folder_1");
        when(uploads.openSession(anyString(), anyString(), anyString(), anyLong(), any())).thenReturn("https://upload");

        var dto = service.startPhotoUpload(userId, new StartProfilePhotoUploadRequest("image/webp", 1000L),
                "http://localhost:3000");

        assertThat(dto.uploadUrl()).isEqualTo("https://upload");
        verify(uploads).openSession("folder_1", "profile-" + userId + "-1700000000000.webp", "image/webp", 1000L,
                "http://localhost:3000");
    }

    @Test
    @DisplayName("upload session: at most 10 profile photo upload links per hour")
    void startPhotoUploadIsLimitedPerHour() {
        when(photoDrive.ensureFolder()).thenReturn("folder_1");
        when(uploads.openSession(anyString(), anyString(), anyString(), anyLong(), any())).thenReturn("https://upload");
        var req = new StartProfilePhotoUploadRequest("image/webp", 1000L);

        for (int i = 0; i < 10; i++) {
            service.startPhotoUpload(userId, req, null);
        }
        assertThatThrownBy(() -> service.startPhotoUpload(userId, req, null))
                .isInstanceOf(TooManyRequestsException.class);
        verify(uploads, times(10)).openSession(anyString(), anyString(), anyString(), anyLong(), any());
    }

    @Test
    @DisplayName("room profiles: one page, with a cursor when there is more")
    void listForRoomPaginates() {
        UUID roomId = UUID.randomUUID();
        UserProfile a = new UserProfile(UUID.randomUUID());
        UserProfile b = new UserProfile(UUID.randomUUID());
        a.setColor("teal");
        a.setPhotoDriveFileId("file_a");
        when(repo.findForActiveMembers(eq(roomId), isNull(), any())).thenReturn(java.util.List.of(a, b));

        var page = service.listForRoom(roomId, null, 1);

        assertThat(page.items()).hasSize(1);
        assertThat(page.items().get(0).userId()).isEqualTo(a.getUserId());
        assertThat(page.items().get(0).color()).isEqualTo("teal");
        assertThat(page.items().get(0).photoDriveFileId()).isEqualTo("file_a");
        assertThat(page.nextCursor()).isEqualTo(a.getUserId().toString());
    }
}

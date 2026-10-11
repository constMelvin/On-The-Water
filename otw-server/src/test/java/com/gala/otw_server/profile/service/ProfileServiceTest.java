package com.gala.otw_server.profile.service;

import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;
import com.gala.otw_server.profile.dto.ProfileDto;
import com.gala.otw_server.profile.entity.UserProfile;
import com.gala.otw_server.profile.repository.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock private UserProfileRepository repo;

    private ProfileService service;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new ProfileService(repo);
    }

    @Test
    @DisplayName("never saved: an empty profile, not a 404")
    void emptyWhenAbsent() {
        when(repo.findById(userId)).thenReturn(Optional.empty());

        ProfileDto p = service.get(userId);

        assertThat(p.nickname()).isEmpty();
        assertThat(p.status()).isEmpty();
        assertThat(p.color()).isNull();
        assertThat(p.photo()).isNull();
    }

    @Test
    @DisplayName("update trims text, keeps colour and a valid photo, and is keyed by the caller's id")
    void updateSaves() {
        when(repo.findById(userId)).thenReturn(Optional.empty());
        when(repo.save(any(UserProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        service.update(userId, new ProfileDto("  Mimi ", " late lang ", "teal", "data:image/webp;base64,AAAA"));

        ArgumentCaptor<UserProfile> saved = ArgumentCaptor.forClass(UserProfile.class);
        verify(repo).save(saved.capture());
        assertThat(saved.getValue().getUserId()).isEqualTo(userId);
        assertThat(saved.getValue().getNickname()).isEqualTo("Mimi");
        assertThat(saved.getValue().getStatus()).isEqualTo("late lang");
        assertThat(saved.getValue().getColor()).isEqualTo("teal");
        assertThat(saved.getValue().getPhoto()).isEqualTo("data:image/webp;base64,AAAA");
    }

    @Test
    @DisplayName("a blank photo clears it")
    void blankPhotoClears() {
        UserProfile existing = new UserProfile(userId);
        existing.setPhoto("data:image/png;base64,AAAA");
        when(repo.findById(userId)).thenReturn(Optional.of(existing));
        when(repo.save(any(UserProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        ProfileDto out = service.update(userId, new ProfileDto("", "", null, " "));

        assertThat(out.photo()).isNull();
    }

    @Test
    @DisplayName("room profiles: one page, with a cursor when there is more")
    void listForRoomPaginates() {
        UUID roomId = UUID.randomUUID();
        UserProfile a = new UserProfile(UUID.randomUUID());
        UserProfile b = new UserProfile(UUID.randomUUID());
        a.setColor("teal");
        when(repo.findForActiveMembers(eq(roomId), isNull(), any())).thenReturn(java.util.List.of(a, b));

        var page = service.listForRoom(roomId, null, 1);

        assertThat(page.items()).hasSize(1);
        assertThat(page.items().get(0).userId()).isEqualTo(a.getUserId());
        assertThat(page.items().get(0).color()).isEqualTo("teal");
        assertThat(page.nextCursor()).isEqualTo(a.getUserId().toString());
    }

    @Test
    @DisplayName("photo must be a webp/jpeg/png data URL")
    void rejectsOtherPhotoTypes() {
        assertThatThrownBy(() -> service.update(userId, new ProfileDto("", "", null, "https://evil.example/x.png")))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> service.update(userId, new ProfileDto("", "", null, "data:image/svg+xml;base64,AAAA")))
                .isInstanceOf(InvalidRequestException.class);
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("photo payload must be plain base64 (no markup rides along)")
    void rejectsNonBase64() {
        assertThatThrownBy(() -> service.update(userId,
                new ProfileDto("", "", null, "data:image/png;base64,AA\"><script>")))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    @DisplayName("photo over the size cap is rejected")
    void rejectsOversizedPhoto() {
        String big = "data:image/webp;base64," + "A".repeat(ProfileService.PHOTO_MAX_CHARS);

        assertThatThrownBy(() -> service.update(userId, new ProfileDto("", "", null, big)))
                .isInstanceOf(InvalidRequestException.class);
        verify(repo, never()).save(any());
    }
}

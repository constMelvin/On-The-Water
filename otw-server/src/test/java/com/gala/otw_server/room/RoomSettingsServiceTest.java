package com.gala.otw_server.room;

import com.gala.otw_server.cache.CacheService;
import com.gala.otw_server.chat.service.ChatSystemMessageService;
import com.gala.otw_server.common.DomainExceptions.*;
import com.gala.otw_server.notification.dto.RoomNotificationEvent;
import com.gala.otw_server.notification.entity.NotificationType;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.dto.*;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.entity.RsvpStatus;
import com.gala.otw_server.room.entity.TravelStatus;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.room.service.GalaClock;
import com.gala.otw_server.room.service.RoomSettingsService;
import com.gala.otw_server.security.auth.RoomRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoomSettingsServiceTest {

    @Mock private RoomRepository roomRepo;
    @Mock private RoomMemberRepository memberRepo;
    @Mock private RealtimeEventPublisher realtime;
    @Mock private CacheService cacheService;
    @Mock private ChatSystemMessageService chatSystem;
    @Mock private ApplicationEventPublisher events;
    @Mock private JdbcTemplate jdbc;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    private RoomSettingsService service;

    private final UUID roomId = UUID.randomUUID();
    private final UUID hostId = UUID.randomUUID();
    private final UUID memberId = UUID.randomUUID();
    private Room room;

    @BeforeEach
    void setUp() {
        service = new RoomSettingsService(roomRepo, memberRepo, realtime, cacheService, passwordEncoder,
                new GalaClock("Asia/Manila"), chatSystem, events, jdbc);
        room = new Room();
        room.setId(roomId);
        room.setRoomCode("ROOM1234");
        room.setTitle("Baguio");
        room.setStatus("ACTIVE");
        room.setStartDate(LocalDate.of(2026, 11, 14));
        room.setHostUserId(hostId);
        lenient().when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        lenient().when(roomRepo.save(any(Room.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private RoomMember member(UUID userId, RoomRole role) {
        RoomMember m = new RoomMember();
        m.setId(UUID.randomUUID());
        m.setUserId(userId);
        m.setNickname("Bea");
        m.setRole(role);
        return m;
    }

    @Test
    @DisplayName("updateRoom changes details and permission toggles, leaving other fields alone")
    void updateRoom_partial() {
        RoomDto dto = service.updateRoom(roomId, new UpdateRoomRequest(
                "Baguio Na Talaga", null, null, LocalDate.of(2026, 11, 15), null, null, null,
                null, null, null, false, null, null, false, true, null, null));

        assertThat(dto.title()).isEqualTo("Baguio Na Talaga");
        assertThat(dto.endDate()).isEqualTo(LocalDate.of(2026, 11, 15));
        assertThat(dto.permissions().membersCanEditPlan()).isFalse();
        assertThat(dto.permissions().membersCanAddPhotos()).isTrue();
        assertThat(dto.permissions().locationSharingEnabled()).isFalse();
        assertThat(dto.listed()).isTrue();
        verify(realtime).publish(eq(roomId), eq("room.updated"), any());
    }

    @Test
    @DisplayName("updateRoom rejects an end date before the start date")
    void updateRoom_badDates() {
        assertThatThrownBy(() -> service.updateRoom(roomId, new UpdateRoomRequest(
                null, null, null, LocalDate.of(2026, 11, 1), null, null, null,
                null, null, null, null, null, null, null, null, null, null)))
                .isInstanceOf(InvalidRequestException.class);
        verify(roomRepo, never()).save(any());
    }

    private UpdateRoomRequest destinationUpdate(String destination, Double lat, Double lng) {
        return new UpdateRoomRequest(null, destination, null, null, null, null, null,
                null, null, null, null, null, null, null, null, lat, lng);
    }

    @Test
    @DisplayName("updateRoom pins the destination without changing its text")
    void updateRoom_pinDestination() {
        room.setDestination("Baguio City");

        RoomDto dto = service.updateRoom(roomId, destinationUpdate(null, 16.4023, 120.596));

        assertThat(dto.destination()).isEqualTo("Baguio City");
        assertThat(dto.destinationLat()).isEqualTo(16.4023);
        assertThat(dto.destinationLng()).isEqualTo(120.596);
    }

    @Test
    @DisplayName("updateRoom clears the old pin when the destination text changes without a new one")
    void updateRoom_newDestinationTextClearsPin() {
        room.setDestination("Baguio City");
        room.setDestinationLat(16.4023);
        room.setDestinationLng(120.596);

        RoomDto dto = service.updateRoom(roomId, destinationUpdate("Tagaytay", null, null));

        assertThat(dto.destination()).isEqualTo("Tagaytay");
        assertThat(dto.destinationLat()).isNull();
        assertThat(dto.destinationLng()).isNull();
    }

    @Test
    @DisplayName("updateRoom keeps the pin when the destination text is sent unchanged")
    void updateRoom_sameDestinationTextKeepsPin() {
        room.setDestination("Baguio City");
        room.setDestinationLat(16.4023);
        room.setDestinationLng(120.596);

        RoomDto dto = service.updateRoom(roomId, destinationUpdate("Baguio City", null, null));

        assertThat(dto.destinationLat()).isEqualTo(16.4023);
    }

    @Test
    @DisplayName("updateRoom moves the pin along with new destination text")
    void updateRoom_newDestinationWithPin() {
        room.setDestination("Baguio City");
        room.setDestinationLat(16.4023);
        room.setDestinationLng(120.596);

        RoomDto dto = service.updateRoom(roomId, destinationUpdate("Tagaytay", 14.1153, 120.9621));

        assertThat(dto.destinationLat()).isEqualTo(14.1153);
        assertThat(dto.destinationLng()).isEqualTo(120.9621);
    }

    @Test
    @DisplayName("updateRoom rejects a destination pin with only one coordinate")
    void updateRoom_halfDestinationPin() {
        assertThatThrownBy(() -> service.updateRoom(roomId, destinationUpdate(null, null, 120.596)))
                .isInstanceOf(InvalidRequestException.class);
        verify(roomRepo, never()).save(any());
    }

    @Test
    @DisplayName("changePassword stores a new BCrypt hash")
    void changePassword() {
        service.changePassword(roomId, new ChangePasswordRequest("newpass99"));

        assertThat(passwordEncoder.matches("newpass99", room.getPasswordHash())).isTrue();
    }

    @Test
    @DisplayName("regenerateCode replaces the gala code")
    void regenerateCode() {
        when(roomRepo.existsByRoomCode(anyString())).thenReturn(false);

        RoomDto dto = service.regenerateCode(roomId);

        assertThat(dto.roomCode()).hasSize(8).isNotEqualTo("ROOM1234");
        verify(realtime).publish(eq(roomId), eq("room.code.changed"), any());
    }

    @Test
    @DisplayName("archive then restore flips status and publishes both events")
    void archiveAndRestore() {
        assertThat(service.archiveRoom(roomId).status()).isEqualTo("ARCHIVED");
        assertThat(service.restoreRoom(roomId).status()).isEqualTo("ACTIVE");
        verify(realtime).publish(eq(roomId), eq("room.archived"), any());
        verify(realtime).publish(eq(roomId), eq("room.restored"), any());
    }

    @Test
    @DisplayName("deleteRoom evicts every member's cached role and deletes the room")
    void deleteRoom() {
        when(memberRepo.findByRoom_IdAndLeftAtIsNull(roomId))
                .thenReturn(List.of(member(hostId, RoomRole.HOST), member(memberId, RoomRole.MEMBER)));

        service.deleteRoom(roomId);

        verify(cacheService).evictAfterCommit("room:" + roomId + ":member:" + hostId);
        verify(cacheService).evictAfterCommit("room:" + roomId + ":member:" + memberId);
        verify(roomRepo).delete(room);
        verify(realtime).publish(eq(roomId), eq("room.deleted"), any());
    }

    @Test
    @DisplayName("leaveRoom marks the member left, stops their location, and posts a chat line")
    void leaveRoom() {
        RoomMember me = member(memberId, RoomRole.MEMBER);
        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, memberId)).thenReturn(Optional.of(me));

        service.leaveRoom(roomId, memberId);

        assertThat(me.getLeftAt()).isNotNull();
        verify(jdbc).update(contains("DELETE FROM member_locations"), eq(roomId), eq(memberId));
        verify(cacheService).evictAfterCommit("room:" + roomId + ":member:" + memberId);
        verify(chatSystem).system(roomId, "Bea left the gala.");
    }

    @Test
    @DisplayName("the Gala Leader can't leave")
    void leaveRoom_host() {
        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, hostId))
                .thenReturn(Optional.of(member(hostId, RoomRole.HOST)));

        assertThatThrownBy(() -> service.leaveRoom(roomId, hostId)).isInstanceOf(HostCannotLeaveException.class);
        verify(memberRepo, never()).save(any());
    }

    @Test
    @DisplayName("updateMyMembership rejects a nickname another active member already has")
    void updateNickname_duplicate() {
        RoomMember me = member(memberId, RoomRole.MEMBER);
        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, memberId)).thenReturn(Optional.of(me));
        when(memberRepo.existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNullAndIdNot(roomId, "CJ", me.getId()))
                .thenReturn(true);

        assertThatThrownBy(() -> service.updateMyMembership(roomId, memberId, new UpdateMyMembershipRequest("CJ")))
                .isInstanceOf(DuplicateNicknameException.class);
    }

    @Test
    @DisplayName("updateTravelStatus stores the status and broadcasts it")
    void updateTravelStatus() {
        RoomMember me = member(memberId, RoomRole.MEMBER);
        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, memberId)).thenReturn(Optional.of(me));
        when(memberRepo.save(any(RoomMember.class))).thenAnswer(inv -> inv.getArgument(0));

        RoomMemberDto dto = service.updateTravelStatus(roomId, memberId,
                new UpdateTravelStatusRequest(TravelStatus.ALMOST_THERE));

        assertThat(dto.travelStatus()).isEqualTo(TravelStatus.ALMOST_THERE);
        verify(realtime).publish(eq(roomId), eq("member.travel.changed"), any());
    }

    @Test
    @DisplayName("nudge pings a Maybe and queues a NUDGE notification for them only")
    void nudge_maybe() {
        RoomMember maybe = member(memberId, RoomRole.MEMBER);
        maybe.setRsvpStatus(RsvpStatus.MAYBE);
        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, memberId)).thenReturn(Optional.of(maybe));

        service.nudge(roomId, hostId, memberId);

        verify(realtime).publish(eq(roomId), eq("member.nudged"), any());
        verify(events).publishEvent(argThat((Object e) -> e instanceof RoomNotificationEvent ev
                && ev.type() == NotificationType.NUDGE && memberId.equals(ev.targetUserId())));
    }

    @Test
    @DisplayName("nudge refuses members who already answered")
    void nudge_notMaybe() {
        RoomMember going = member(memberId, RoomRole.MEMBER);
        going.setRsvpStatus(RsvpStatus.GOING);
        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, memberId)).thenReturn(Optional.of(going));

        assertThatThrownBy(() -> service.nudge(roomId, hostId, memberId)).isInstanceOf(InvalidRequestException.class);
        verifyNoInteractions(events);
    }
}

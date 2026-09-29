package com.gala.otw_server.room;

import com.gala.otw_server.cache.CacheService;
import com.gala.otw_server.common.DomainExceptions.*;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.dto.*;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.room.service.RoomService;
import com.gala.otw_server.room.entity.RsvpStatus;
import com.gala.otw_server.security.auth.RoomRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.hibernate.exception.ConstraintViolationException;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoomServiceTest {

    @Mock
    private RoomRepository roomRepo;

    @Mock
    private RoomMemberRepository memberRepo;

    @Mock
    private RealtimeEventPublisher realtime;

    @Mock
    private CacheService cacheService;

    private RoomService roomService;

    private final UUID callerId = UUID.randomUUID();
    private final UUID roomId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        roomService = new RoomService(roomRepo, memberRepo, realtime, cacheService);
    }

    @Test
    @DisplayName("createRoom creates a room and assigns the creator as HOST member")
    void createRoom_success() {
        CreateRoomRequest req = new CreateRoomRequest(
                "Beach Gala",
                "Melvin",
                OffsetDateTime.now().plusDays(7),
                14.5995,
                120.9842,
                "Manila Bay"
        );

        when(roomRepo.existsByRoomCode(anyString())).thenReturn(false);
        when(roomRepo.save(any(Room.class))).thenAnswer(inv -> {
            Room r = inv.getArgument(0);
            r.setId(roomId);
            r.setStatus("ACTIVE");
            return r;
        });

        RoomDto result = roomService.createRoom(callerId, req);

        assertThat(result.id()).isEqualTo(roomId);
        assertThat(result.title()).isEqualTo("Beach Gala");
        assertThat(result.roomCode()).isNotNull();

        verify(memberRepo).save(argThat(member ->
                member.getRole() == RoomRole.HOST &&
                member.getUserId().equals(callerId) &&
                "Melvin".equals(member.getNickname())
        ));
    }

    @Test
    @DisplayName("joinRoom joins room, creates MEMBER, and publishes realtime event")
    void joinRoom_success() {
        JoinRoomRequest req = new JoinRoomRequest("ROOM1234", "Carlos");
        Room room = new Room();
        room.setId(roomId);
        room.setRoomCode("ROOM1234");
        room.setStatus("ACTIVE");

        when(roomRepo.findByRoomCodeAndStatus("ROOM1234", "ACTIVE")).thenReturn(Optional.of(room));
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)).thenReturn(false);
        when(memberRepo.existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(roomId, "Carlos")).thenReturn(false);
        when(memberRepo.saveAndFlush(any(RoomMember.class))).thenAnswer(inv -> {
            RoomMember m = inv.getArgument(0);
            m.setId(UUID.randomUUID());
            m.setJoinedAt(OffsetDateTime.now());
            return m;
        });

        RoomMemberDto result = roomService.joinRoom(callerId, req);

        assertThat(result.userId()).isEqualTo(callerId);
        assertThat(result.role()).isEqualTo(RoomRole.MEMBER);
        assertThat(result.rsvpStatus()).isEqualTo(RsvpStatus.PENDING);

        verify(realtime).publish(eq(roomId), eq("member.joined"), any());
    }

    @Test
    @DisplayName("joinRoom throws AlreadyAMemberException when user is active member")
    void joinRoom_alreadyMember() {
        JoinRoomRequest req = new JoinRoomRequest("ROOM1234", "Carlos");
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        when(roomRepo.findByRoomCodeAndStatus("ROOM1234", "ACTIVE")).thenReturn(Optional.of(room));
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)).thenReturn(true);

        assertThatThrownBy(() -> roomService.joinRoom(callerId, req))
                .isInstanceOf(AlreadyAMemberException.class);
    }

    @Test
    @DisplayName("joinRoom throws DuplicateNicknameException when nickname is taken by an active member")
    void joinRoom_duplicateNickname() {
        JoinRoomRequest req = new JoinRoomRequest("ROOM1234", "Miguel");
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        when(roomRepo.findByRoomCodeAndStatus("ROOM1234", "ACTIVE")).thenReturn(Optional.of(room));
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)).thenReturn(false);
        when(memberRepo.existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(roomId, "Miguel")).thenReturn(true);

        assertThatThrownBy(() -> roomService.joinRoom(callerId, req))
                .isInstanceOf(DuplicateNicknameException.class);

        verify(memberRepo, never()).save(any(RoomMember.class));
    }

    @Test
    @DisplayName("joinRoom maps a raced nickname-index violation to DuplicateNicknameException")
    void joinRoom_duplicateNickname_concurrentRace() {
        JoinRoomRequest req = new JoinRoomRequest("ROOM1234", "Miguel");
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        when(roomRepo.findByRoomCodeAndStatus("ROOM1234", "ACTIVE")).thenReturn(Optional.of(room));
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)).thenReturn(false);
        // Pre-check passes (no active "Miguel" yet)...
        when(memberRepo.existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(roomId, "Miguel")).thenReturn(false);
        // ...but a concurrent request beats this one to the insert. saveAndFlush
        // (not save) is what surfaces this violation inside the try at all.
        when(memberRepo.saveAndFlush(any(RoomMember.class)))
                .thenThrow(nicknameIndexViolation());

        assertThatThrownBy(() -> roomService.joinRoom(callerId, req))
                .isInstanceOf(DuplicateNicknameException.class);
    }

    @Test
    @DisplayName("joinRoom does not relabel an unrelated constraint violation as DuplicateNicknameException")
    void joinRoom_otherConstraintViolation_isNotMappedToDuplicateNickname() {
        JoinRoomRequest req = new JoinRoomRequest("ROOM1234", "Miguel");
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        when(roomRepo.findByRoomCodeAndStatus("ROOM1234", "ACTIVE")).thenReturn(Optional.of(room));
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)).thenReturn(false);
        when(memberRepo.existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(roomId, "Miguel")).thenReturn(false);
        // A different constraint (e.g. room_members_room_id_user_id_key, hit when
        // a left member rejoins) must NOT be mislabeled as a nickname collision.
        DataIntegrityViolationException otherViolation = new DataIntegrityViolationException(
                "duplicate key value violates unique constraint",
                new ConstraintViolationException("insert failed",
                        new SQLException("duplicate key"), "room_members_room_id_user_id_key"));
        when(memberRepo.saveAndFlush(any(RoomMember.class))).thenThrow(otherViolation);

        assertThatThrownBy(() -> roomService.joinRoom(callerId, req))
                .isSameAs(otherViolation);
    }

    private static DataIntegrityViolationException nicknameIndexViolation() {
        return new DataIntegrityViolationException(
                "duplicate key value violates unique constraint",
                new ConstraintViolationException("insert failed",
                        new SQLException("duplicate key"), "idx_room_members_room_nickname_active"));
    }

    @Test
    @DisplayName("updateRsvp updates status and publishes realtime event")
    void updateRsvp_success() {
        UpdateRsvpRequest req = new UpdateRsvpRequest(RsvpStatus.GOING);
        RoomMember member = new RoomMember();
        member.setId(UUID.randomUUID());
        member.setUserId(callerId);
        member.setRole(RoomRole.MEMBER);
        member.setRsvpStatus(RsvpStatus.PENDING);

        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)).thenReturn(Optional.of(member));
        when(memberRepo.save(any(RoomMember.class))).thenAnswer(inv -> inv.getArgument(0));

        RoomMemberDto result = roomService.updateRsvp(roomId, callerId, req);

        assertThat(result.rsvpStatus()).isEqualTo(RsvpStatus.GOING);
        verify(realtime).publish(eq(roomId), eq("member.rsvp.changed"), any());
    }

    @Test
    @DisplayName("removeMember marks leftAt, evicts cache, and publishes event")
    void removeMember_success() {
        UUID targetUserId = UUID.randomUUID();
        RoomMember member = new RoomMember();
        member.setId(UUID.randomUUID());
        member.setUserId(targetUserId);
        member.setRole(RoomRole.MEMBER);

        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, targetUserId)).thenReturn(Optional.of(member));

        roomService.removeMember(roomId, targetUserId);

        assertThat(member.getLeftAt()).isNotNull();
        verify(memberRepo).save(member);
        verify(cacheService).evictAfterCommit(eq("room:" + roomId + ":member:" + targetUserId));
        verify(realtime).publish(eq(roomId), eq("member.left"), any());
    }

    @Test
    @DisplayName("removeMember throws ForbiddenException when removing HOST")
    void removeMember_cannotRemoveHost() {
        UUID hostId = UUID.randomUUID();
        RoomMember host = new RoomMember();
        host.setId(UUID.randomUUID());
        host.setUserId(hostId);
        host.setRole(RoomRole.HOST);

        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, hostId)).thenReturn(Optional.of(host));

        assertThatThrownBy(() -> roomService.removeMember(roomId, hostId))
                .isInstanceOf(ForbiddenException.class);
    }
}

package com.gala.otw_server.room;

import com.gala.otw_server.cache.CacheService;
import com.gala.otw_server.common.DomainExceptions.*;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.group.entity.Group;
import com.gala.otw_server.group.repository.GroupRepository;
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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.OffsetDateTime;
import java.util.List;
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
    private GroupRepository groupRepo;

    @Mock
    private RealtimeEventPublisher realtime;

    @Mock
    private CacheService cacheService;

    private RoomService roomService;

    private final UUID callerId = UUID.randomUUID();
    private final UUID roomId = UUID.randomUUID();
    private final UUID groupId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        roomService = new RoomService(roomRepo, memberRepo, groupRepo, realtime, cacheService);
    }

    @Test
    @DisplayName("createRoom creates standalone room and assigns host as HOST member")
    void createRoom_standalone_success() {
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
        assertThat(result.groupId()).isNull();

        verify(memberRepo).save(argThat(member ->
                member.getRole() == RoomRole.HOST &&
                member.getUserId().equals(callerId) &&
                "Melvin".equals(member.getNickname())
        ));
    }

    @Test
    @DisplayName("createGroupRoom creates room scoped to group")
    void createGroupRoom_success() {
        CreateRoomRequest req = new CreateRoomRequest("Group Gala", "Melvin", null, null, null, null);
        Group group = new Group();
        group.setId(groupId);
        group.setStatus("ACTIVE");

        when(groupRepo.findById(groupId)).thenReturn(Optional.of(group));
        when(roomRepo.existsByRoomCode(anyString())).thenReturn(false);
        when(roomRepo.save(any(Room.class))).thenAnswer(inv -> {
            Room r = inv.getArgument(0);
            r.setId(roomId);
            r.setStatus("ACTIVE");
            return r;
        });

        RoomDto result = roomService.createGroupRoom(callerId, groupId, req);

        assertThat(result.id()).isEqualTo(roomId);
        assertThat(result.groupId()).isEqualTo(groupId);
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
        when(memberRepo.save(any(RoomMember.class))).thenAnswer(inv -> {
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

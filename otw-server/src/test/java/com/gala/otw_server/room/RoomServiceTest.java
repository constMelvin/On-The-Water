package com.gala.otw_server.room;

import com.gala.otw_server.cache.CacheService;
import com.gala.otw_server.chat.service.ChatSystemMessageService;
import com.gala.otw_server.common.DomainExceptions.*;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.notification.dto.RoomNotificationEvent;
import com.gala.otw_server.notification.entity.NotificationType;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.dto.*;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.entity.RoomType;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.room.service.GalaClock;
import com.gala.otw_server.room.service.MemberIdentityRemapper;
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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.sql.SQLException;
import java.time.*;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
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

    @Mock
    private MemberIdentityRemapper remapper;

    @Mock
    private ChatSystemMessageService chatSystem;

    @Mock
    private ApplicationEventPublisher events;

    // Low cost factor keeps the tests fast; same algorithm as production.
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);

    private final GalaClock galaClock = new GalaClock(
            Clock.fixed(Instant.parse("2026-09-29T01:41:00Z"), ZoneId.of("Asia/Manila")));

    private RoomService roomService;

    private final UUID callerId = UUID.randomUUID();
    private final UUID roomId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        roomService = new RoomService(roomRepo, memberRepo, realtime, cacheService,
                passwordEncoder, galaClock, remapper, chatSystem, events);
    }

    private CreateRoomRequest createRequest(RoomType type) {
        return new CreateRoomRequest(
                "Baguio Before Graduation",
                "Merylle",
                LocalDate.of(2026, 11, 14),
                LocalDate.of(2026, 11, 15),
                LocalTime.of(5, 30),
                LocalTime.of(21, 0),
                "Baguio City",
                "baguio2026",
                type,
                null, null, null, null, null);
    }

    private CreateRoomRequest createRequestAt(Double lat, Double lng) {
        return new CreateRoomRequest("Baguio Before Graduation", "Merylle", LocalDate.of(2026, 11, 14),
                null, null, null, "Baguio City", "baguio2026", null, null, null, null, lat, lng);
    }

    private Room activeRoom(String code) {
        Room room = new Room();
        room.setId(roomId);
        room.setRoomCode(code);
        room.setTitle("Baguio Before Graduation");
        room.setStatus("ACTIVE");
        return room;
    }

    // ── Create ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("createRoom stores gala details, hashes the gala password, and makes the creator HOST")
    void createRoom_success() {
        when(roomRepo.existsByRoomCode(anyString())).thenReturn(false);
        when(roomRepo.save(any(Room.class))).thenAnswer(inv -> {
            Room r = inv.getArgument(0);
            r.setId(roomId);
            return r;
        });

        RoomDto result = roomService.createRoom(callerId, false, createRequest(null));

        assertThat(result.id()).isEqualTo(roomId);
        assertThat(result.title()).isEqualTo("Baguio Before Graduation");
        assertThat(result.destination()).isEqualTo("Baguio City");
        assertThat(result.type()).isEqualTo(RoomType.GROUP);
        assertThat(result.hasPassword()).isTrue();
        assertThat(result.myRole()).isEqualTo(RoomRole.HOST);
        assertThat(result.roomCode()).hasSize(8);
        // 5:30 AM Manila on Nov 14
        assertThat(result.scheduleAt().toInstant()).isEqualTo(Instant.parse("2026-11-13T21:30:00Z"));

        verify(roomRepo).save(argThat(r -> r.getPasswordHash() != null
                && !r.getPasswordHash().contains("baguio2026")
                && passwordEncoder.matches("baguio2026", r.getPasswordHash())));
        verify(memberRepo).save(argThat(member ->
                member.getRole() == RoomRole.HOST &&
                member.getUserId().equals(callerId) &&
                "Merylle".equals(member.getNickname()) &&
                member.getRsvpStatus() == RsvpStatus.GOING &&
                !member.isHasAccount()
        ));
    }

    @Test
    @DisplayName("createRoom rejects an end date before the start date")
    void createRoom_endBeforeStart() {
        CreateRoomRequest bad = new CreateRoomRequest("Trip", "Me", LocalDate.of(2026, 11, 14),
                LocalDate.of(2026, 11, 13), null, null, "Baguio", "secret1", null, null, null, null, null, null);

        assertThatThrownBy(() -> roomService.createRoom(callerId, true, bad))
                .isInstanceOf(InvalidRequestException.class);
        verify(roomRepo, never()).save(any());
    }

    @Test
    @DisplayName("createRoom stores and returns the destination pin")
    void createRoom_destinationPin() {
        when(roomRepo.existsByRoomCode(anyString())).thenReturn(false);
        when(roomRepo.save(any(Room.class))).thenAnswer(inv -> inv.getArgument(0));

        RoomDto result = roomService.createRoom(callerId, true, createRequestAt(16.4023, 120.596));

        assertThat(result.destinationLat()).isEqualTo(16.4023);
        assertThat(result.destinationLng()).isEqualTo(120.596);
    }

    @Test
    @DisplayName("createRoom rejects a destination pin with only one coordinate")
    void createRoom_halfDestinationPin() {
        assertThatThrownBy(() -> roomService.createRoom(callerId, true, createRequestAt(16.4023, null)))
                .isInstanceOf(InvalidRequestException.class);
        verify(roomRepo, never()).save(any());
    }

    // ── Preview ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("previewRoom accepts an OTW- prefixed, lowercase code and returns the gala card")
    void previewRoom_normalizesCode() {
        Room room = activeRoom("7K2PABCD");
        room.setRoomType(RoomType.COUPLE);
        when(roomRepo.findByRoomCodeAndStatus("7K2PABCD", "ACTIVE")).thenReturn(Optional.of(room));
        when(memberRepo.countByRoom_IdAndLeftAtIsNull(roomId)).thenReturn(2L);
        RoomMember m = new RoomMember();
        m.setNickname("Merylle");
        when(memberRepo.findTop12ByRoom_IdAndLeftAtIsNullOrderByJoinedAtAsc(roomId)).thenReturn(List.of(m));

        RoomPreviewDto preview = roomService.previewRoom("otw-7k2p-abcd");

        assertThat(preview.title()).isEqualTo("Baguio Before Graduation");
        assertThat(preview.memberCount()).isEqualTo(2);
        assertThat(preview.nicknames()).containsExactly("Merylle");
        assertThat(preview.full()).isTrue();
    }

    // ── Join ──────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("joinRoom joins room, creates MEMBER, posts a chat line, and publishes events")
    void joinRoom_success() {
        JoinRoomRequest req = new JoinRoomRequest("ROOM1234", "Carlos", "baguio2026");
        Room room = roomWithPassword();

        when(roomRepo.findByRoomCodeAndStatus("ROOM1234", "ACTIVE")).thenReturn(Optional.of(room));
        when(memberRepo.findByRoom_IdAndUserId(roomId, callerId)).thenReturn(Optional.empty());
        when(memberRepo.existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(roomId, "Carlos")).thenReturn(false);
        when(memberRepo.saveAndFlush(any(RoomMember.class))).thenAnswer(inv -> {
            RoomMember m = inv.getArgument(0);
            m.setId(UUID.randomUUID());
            return m;
        });

        RoomMemberDto result = roomService.joinRoom(callerId, false, req);

        assertThat(result.userId()).isEqualTo(callerId);
        assertThat(result.role()).isEqualTo(RoomRole.MEMBER);
        assertThat(result.rsvpStatus()).isEqualTo(RsvpStatus.PENDING);

        verify(realtime).publish(eq(roomId), eq("member.joined"), any());
        verify(chatSystem).system(roomId, "Carlos joined the gala.");
        verify(events).publishEvent(argThat((Object e) -> e instanceof RoomNotificationEvent ev
                && ev.type() == NotificationType.SOMEONE_JOINED && callerId.equals(ev.actorUserId())));
    }

    @Test
    @DisplayName("joinRoom refuses a wrong Gala Password before touching membership")
    void joinRoom_wrongPassword() {
        JoinRoomRequest req = new JoinRoomRequest("ROOM1234", "Carlos", "not-the-password");
        when(roomRepo.findByRoomCodeAndStatus("ROOM1234", "ACTIVE")).thenReturn(Optional.of(roomWithPassword()));

        assertThatThrownBy(() -> roomService.joinRoom(callerId, true, req))
                .isInstanceOf(InvalidGalaPasswordException.class);
        verify(memberRepo, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("joinRoom reactivates the old row when a member who left joins again")
    void joinRoom_rejoinAfterLeaving() {
        JoinRoomRequest req = new JoinRoomRequest("ROOM1234", "Carlos", "baguio2026");
        Room room = roomWithPassword();
        RoomMember left = new RoomMember();
        left.setId(UUID.randomUUID());
        left.setRoom(room);
        left.setUserId(callerId);
        left.setNickname("OldName");
        left.setRsvpStatus(RsvpStatus.GOING);
        left.setLeftAt(OffsetDateTime.now().minusDays(1));

        when(roomRepo.findByRoomCodeAndStatus("ROOM1234", "ACTIVE")).thenReturn(Optional.of(room));
        when(memberRepo.findByRoom_IdAndUserId(roomId, callerId)).thenReturn(Optional.of(left));
        when(memberRepo.existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(roomId, "Carlos")).thenReturn(false);
        when(memberRepo.saveAndFlush(any(RoomMember.class))).thenAnswer(inv -> inv.getArgument(0));

        RoomMemberDto result = roomService.joinRoom(callerId, false, req);

        assertThat(result.id()).isEqualTo(left.getId());
        assertThat(left.getLeftAt()).isNull();
        assertThat(left.getNickname()).isEqualTo("Carlos");
        assertThat(left.getRsvpStatus()).isEqualTo(RsvpStatus.PENDING);
    }

    @Test
    @DisplayName("joinRoom throws AlreadyAMemberException when user is active member")
    void joinRoom_alreadyMember() {
        JoinRoomRequest req = new JoinRoomRequest("ROOM1234", "Carlos", "baguio2026");
        Room room = roomWithPassword();
        RoomMember active = new RoomMember();
        active.setUserId(callerId);

        when(roomRepo.findByRoomCodeAndStatus("ROOM1234", "ACTIVE")).thenReturn(Optional.of(room));
        when(memberRepo.findByRoom_IdAndUserId(roomId, callerId)).thenReturn(Optional.of(active));

        assertThatThrownBy(() -> roomService.joinRoom(callerId, false, req))
                .isInstanceOf(AlreadyAMemberException.class);
    }

    @Test
    @DisplayName("joinRoom rejects a third person in a couple gala with RoomFullException")
    void joinRoom_coupleFull() {
        JoinRoomRequest req = new JoinRoomRequest("ROOM1234", "Third", "baguio2026");
        Room room = roomWithPassword();
        room.setRoomType(RoomType.COUPLE);

        when(roomRepo.findByRoomCodeAndStatus("ROOM1234", "ACTIVE")).thenReturn(Optional.of(room));
        when(memberRepo.findByRoom_IdAndUserId(roomId, callerId)).thenReturn(Optional.empty());
        when(memberRepo.existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(roomId, "Third")).thenReturn(false);
        when(memberRepo.countByRoom_IdAndLeftAtIsNull(roomId)).thenReturn(2L);

        assertThatThrownBy(() -> roomService.joinRoom(callerId, false, req))
                .isInstanceOf(RoomFullException.class);
        verify(memberRepo, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("joinRoom throws DuplicateNicknameException when nickname is taken by an active member")
    void joinRoom_duplicateNickname() {
        JoinRoomRequest req = new JoinRoomRequest("ROOM1234", "Miguel", "baguio2026");
        Room room = roomWithPassword();

        when(roomRepo.findByRoomCodeAndStatus("ROOM1234", "ACTIVE")).thenReturn(Optional.of(room));
        when(memberRepo.findByRoom_IdAndUserId(roomId, callerId)).thenReturn(Optional.empty());
        when(memberRepo.existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(roomId, "Miguel")).thenReturn(true);

        assertThatThrownBy(() -> roomService.joinRoom(callerId, false, req))
                .isInstanceOf(DuplicateNicknameException.class);

        verify(memberRepo, never()).save(any(RoomMember.class));
    }

    @Test
    @DisplayName("joinRoom maps a raced nickname-index violation to DuplicateNicknameException")
    void joinRoom_duplicateNickname_concurrentRace() {
        JoinRoomRequest req = new JoinRoomRequest("ROOM1234", "Miguel", "baguio2026");
        Room room = roomWithPassword();

        when(roomRepo.findByRoomCodeAndStatus("ROOM1234", "ACTIVE")).thenReturn(Optional.of(room));
        when(memberRepo.findByRoom_IdAndUserId(roomId, callerId)).thenReturn(Optional.empty());
        // Pre-check passes (no active "Miguel" yet)...
        when(memberRepo.existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(roomId, "Miguel")).thenReturn(false);
        // ...but a concurrent request beats this one to the insert. saveAndFlush
        // (not save) is what surfaces this violation inside the try at all.
        when(memberRepo.saveAndFlush(any(RoomMember.class)))
                .thenThrow(nicknameIndexViolation());

        assertThatThrownBy(() -> roomService.joinRoom(callerId, false, req))
                .isInstanceOf(DuplicateNicknameException.class);
    }

    @Test
    @DisplayName("joinRoom does not relabel an unrelated constraint violation as DuplicateNicknameException")
    void joinRoom_otherConstraintViolation_isNotMappedToDuplicateNickname() {
        JoinRoomRequest req = new JoinRoomRequest("ROOM1234", "Miguel", "baguio2026");
        Room room = roomWithPassword();

        when(roomRepo.findByRoomCodeAndStatus("ROOM1234", "ACTIVE")).thenReturn(Optional.of(room));
        when(memberRepo.findByRoom_IdAndUserId(roomId, callerId)).thenReturn(Optional.empty());
        when(memberRepo.existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(roomId, "Miguel")).thenReturn(false);
        DataIntegrityViolationException otherViolation = new DataIntegrityViolationException(
                "duplicate key value violates unique constraint",
                new ConstraintViolationException("insert failed",
                        new SQLException("duplicate key"), "room_members_room_id_user_id_key"));
        when(memberRepo.saveAndFlush(any(RoomMember.class))).thenThrow(otherViolation);

        assertThatThrownBy(() -> roomService.joinRoom(callerId, false, req))
                .isSameAs(otherViolation);
    }

    private static DataIntegrityViolationException nicknameIndexViolation() {
        return new DataIntegrityViolationException(
                "duplicate key value violates unique constraint",
                new ConstraintViolationException("insert failed",
                        new SQLException("duplicate key"), "idx_room_members_room_nickname_active"));
    }

    // ── Enter a Gala ──────────────────────────────────────────────────────────

    private Room roomWithPassword() {
        Room room = activeRoom("ROOM1234");
        room.setPasswordHash(passwordEncoder.encode("baguio2026"));
        return room;
    }

    private RoomMember member(UUID userId, String nickname, boolean hasAccount) {
        RoomMember m = new RoomMember();
        m.setId(UUID.randomUUID());
        m.setUserId(userId);
        m.setNickname(nickname);
        m.setRole(RoomRole.MEMBER);
        m.setHasAccount(hasAccount);
        return m;
    }

    @Test
    @DisplayName("enterRoom with the right code + password lists members for 'Which one are you?'")
    void enterRoom_success() {
        Room room = roomWithPassword();
        when(roomRepo.findByRoomCode("ROOM1234")).thenReturn(Optional.of(room));
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)).thenReturn(false);
        when(memberRepo.findTop100ByRoom_IdAndLeftAtIsNullOrderByJoinedAtAsc(roomId))
                .thenReturn(List.of(member(UUID.randomUUID(), "Bea", false), member(UUID.randomUUID(), "CJ", true)));

        EnterRoomResponse res = roomService.enterRoom(callerId, new EnterRoomRequest("room1234", "baguio2026"));

        assertThat(res.roomId()).isEqualTo(roomId);
        assertThat(res.alreadyMember()).isFalse();
        assertThat(res.members()).extracting(EnterRoomResponse.ClaimableMember::nickname).containsExactly("Bea", "CJ");
        assertThat(res.members().get(1).hasAccount()).isTrue();
    }

    @Test
    @DisplayName("enterRoom with a wrong password is rejected with InvalidGalaPasswordException")
    void enterRoom_wrongPassword() {
        when(roomRepo.findByRoomCode("ROOM1234")).thenReturn(Optional.of(roomWithPassword()));

        assertThatThrownBy(() -> roomService.enterRoom(callerId, new EnterRoomRequest("ROOM1234", "nope")))
                .isInstanceOf(InvalidGalaPasswordException.class);
    }

    @Test
    @DisplayName("enterRoom with an unknown code is rejected with InvalidCodeException")
    void enterRoom_unknownCode() {
        when(roomRepo.findByRoomCode("ZZZZZZZZ")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> roomService.enterRoom(callerId, new EnterRoomRequest("ZZZZZZZZ", "x")))
                .isInstanceOf(InvalidCodeException.class);
    }

    @Test
    @DisplayName("enterRoom on a pre-V6 room with no password set is rejected")
    void enterRoom_noPasswordSet() {
        when(roomRepo.findByRoomCode("ROOM1234")).thenReturn(Optional.of(activeRoom("ROOM1234")));

        assertThatThrownBy(() -> roomService.enterRoom(callerId, new EnterRoomRequest("ROOM1234", "anything")))
                .isInstanceOf(InvalidGalaPasswordException.class);
    }

    @Test
    @DisplayName("claimMember rebinds an anonymous member (and everything it owns) to the new session")
    void claimMember_success() {
        Room room = roomWithPassword();
        UUID oldUserId = UUID.randomUUID();
        RoomMember bea = member(oldUserId, "Bea", false);
        when(roomRepo.findByRoomCode("ROOM1234")).thenReturn(Optional.of(room));
        when(memberRepo.findByIdAndRoom_Id(bea.getId(), roomId)).thenReturn(Optional.of(bea));
        when(memberRepo.findByRoom_IdAndUserId(roomId, callerId)).thenReturn(Optional.empty());

        RoomMemberDto dto = roomService.claimMember(callerId, false,
                new ClaimMemberRequest("ROOM1234", "baguio2026", bea.getId()));

        assertThat(dto.userId()).isEqualTo(callerId);
        assertThat(bea.getUserId()).isEqualTo(callerId);
        verify(remapper).remap(roomId, oldUserId, callerId);
        verify(cacheService).evictAfterCommit("room:" + roomId + ":member:" + oldUserId);
        verify(realtime).publish(eq(roomId), eq("member.reclaimed"), any());
    }

    @Test
    @DisplayName("claimMember of the host also moves host_user_id")
    void claimMember_host() {
        Room room = roomWithPassword();
        UUID oldHost = UUID.randomUUID();
        room.setHostUserId(oldHost);
        RoomMember host = member(oldHost, "Merylle", false);
        host.setRole(RoomRole.HOST);
        when(roomRepo.findByRoomCode("ROOM1234")).thenReturn(Optional.of(room));
        when(memberRepo.findByIdAndRoom_Id(host.getId(), roomId)).thenReturn(Optional.of(host));
        when(memberRepo.findByRoom_IdAndUserId(roomId, callerId)).thenReturn(Optional.empty());

        roomService.claimMember(callerId, false, new ClaimMemberRequest("ROOM1234", "baguio2026", host.getId()));

        assertThat(room.getHostUserId()).isEqualTo(callerId);
    }

    @Test
    @DisplayName("claimMember refuses a member linked to an account (they must log in)")
    void claimMember_accountMemberRefused() {
        Room room = roomWithPassword();
        RoomMember cj = member(UUID.randomUUID(), "CJ", true);
        when(roomRepo.findByRoomCode("ROOM1234")).thenReturn(Optional.of(room));
        when(memberRepo.findByIdAndRoom_Id(cj.getId(), roomId)).thenReturn(Optional.of(cj));

        assertThatThrownBy(() -> roomService.claimMember(callerId, false,
                new ClaimMemberRequest("ROOM1234", "baguio2026", cj.getId())))
                .isInstanceOf(MemberHasAccountException.class);
        verifyNoInteractions(remapper);
    }

    @Test
    @DisplayName("claimMember refuses when the caller is already an active member")
    void claimMember_callerAlreadyMember() {
        Room room = roomWithPassword();
        RoomMember bea = member(UUID.randomUUID(), "Bea", false);
        RoomMember me = member(callerId, "Me", false);
        when(roomRepo.findByRoomCode("ROOM1234")).thenReturn(Optional.of(room));
        when(memberRepo.findByIdAndRoom_Id(bea.getId(), roomId)).thenReturn(Optional.of(bea));
        when(memberRepo.findByRoom_IdAndUserId(roomId, callerId)).thenReturn(Optional.of(me));

        assertThatThrownBy(() -> roomService.claimMember(callerId, false,
                new ClaimMemberRequest("ROOM1234", "baguio2026", bea.getId())))
                .isInstanceOf(AlreadyAMemberException.class);
        verifyNoInteractions(remapper);
    }

    @Test
    @DisplayName("claimMember with a wrong password never touches members")
    void claimMember_wrongPassword() {
        when(roomRepo.findByRoomCode("ROOM1234")).thenReturn(Optional.of(roomWithPassword()));

        assertThatThrownBy(() -> roomService.claimMember(callerId, false,
                new ClaimMemberRequest("ROOM1234", "wrong", UUID.randomUUID())))
                .isInstanceOf(InvalidGalaPasswordException.class);
        verifyNoInteractions(remapper);
        verify(memberRepo, never()).findByIdAndRoom_Id(any(), any());
    }

    // ── RSVP / remove ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("updateRsvp updates status, posts the chat line, and publishes realtime event")
    void updateRsvp_success() {
        UpdateRsvpRequest req = new UpdateRsvpRequest(RsvpStatus.GOING);
        RoomMember member = new RoomMember();
        member.setId(UUID.randomUUID());
        member.setUserId(callerId);
        member.setNickname("Sam");
        member.setRole(RoomRole.MEMBER);
        member.setRsvpStatus(RsvpStatus.PENDING);

        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)).thenReturn(Optional.of(member));
        when(memberRepo.save(any(RoomMember.class))).thenAnswer(inv -> inv.getArgument(0));

        RoomMemberDto result = roomService.updateRsvp(roomId, callerId, req);

        assertThat(result.rsvpStatus()).isEqualTo(RsvpStatus.GOING);
        verify(realtime).publish(eq(roomId), eq("member.rsvp.changed"), any());
        verify(chatSystem).system(roomId, "Sam changed their status to I'm G.");
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

    @Test
    @DisplayName("getMembers pages with a cursor")
    void getMembers_pages() {
        RoomMember a = member(UUID.randomUUID(), "A", false);
        RoomMember b = member(UUID.randomUUID(), "B", false);
        when(memberRepo.findActiveMembers(eq(roomId), eq(null), any())).thenReturn(List.of(a, b));

        PageResponse<RoomMemberDto> page = roomService.getMembers(roomId, null, 1);

        assertThat(page.items()).hasSize(1);
        assertThat(page.nextCursor()).isEqualTo(a.getId().toString());
    }
}

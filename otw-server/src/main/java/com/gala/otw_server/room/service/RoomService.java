package com.gala.otw_server.room.service;

import com.gala.otw_server.cache.CacheKeys;
import com.gala.otw_server.cache.CacheService;
import com.gala.otw_server.chat.service.ChatSystemMessageService;
import com.gala.otw_server.common.CodeGenerator;
import com.gala.otw_server.common.DomainExceptions.*;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.notification.dto.RoomNotificationEvent;
import com.gala.otw_server.notification.entity.NotificationType;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.dto.*;
import com.gala.otw_server.room.entity.*;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.security.auth.RoomRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Getting into a gala: create, preview and join, plus the member list, RSVP and host removal.
 * Settings/lifecycle actions live in {@link RoomSettingsService}.
 */
@Service
@Transactional
public class RoomService {

    private static final Logger log = LoggerFactory.getLogger(RoomService.class);
    private static final int MAX_CODE_ATTEMPTS = 5;
    private static final int COUPLE_MAX_MEMBERS = 2;

    private final RoomRepository roomRepo;
    private final RoomMemberRepository memberRepo;
    private final RealtimeEventPublisher realtime;
    private final CacheService cacheService;
    private final PasswordEncoder passwordEncoder;
    private final GalaPasswordGuard passwordGuard;
    private final GalaClock galaClock;
    private final ChatSystemMessageService chatSystem;
    private final ApplicationEventPublisher events;

    public RoomService(RoomRepository roomRepo,
                       RoomMemberRepository memberRepo,
                       RealtimeEventPublisher realtime,
                       CacheService cacheService,
                       PasswordEncoder passwordEncoder,
                       GalaPasswordGuard passwordGuard,
                       GalaClock galaClock,
                       ChatSystemMessageService chatSystem,
                       ApplicationEventPublisher events) {
        this.roomRepo = roomRepo;
        this.memberRepo = memberRepo;
        this.realtime = realtime;
        this.cacheService = cacheService;
        this.passwordEncoder = passwordEncoder;
        this.passwordGuard = passwordGuard;
        this.galaClock = galaClock;
        this.chatSystem = chatSystem;
        this.events = events;
    }

    // ── Create room ("Plan a Gala" → "Tara G!") ───────────────────────────────

    public RoomDto createRoom(UUID callerId, boolean callerHasAccount, CreateRoomRequest req) {
        validateDates(req.startDate(), req.endDate(), req.startTime(), req.endTime());
        validatePin(req.destinationLat(), req.destinationLng());

        Room room = new Room();
        room.setRoomCode(generateUniqueCode());
        room.setTitle(req.title().trim());
        room.setDestination(req.destination().trim());
        room.setDestinationLat(req.destinationLat());
        room.setDestinationLng(req.destinationLng());
        room.setStartDate(req.startDate());
        room.setEndDate(req.endDate());
        room.setStartTime(req.startTime());
        room.setEndTime(req.endTime());
        room.setScheduleAt(galaClock.startOf(room));
        room.setMeetingLat(req.meetingLat());
        room.setMeetingLng(req.meetingLng());
        room.setMeetingLabel(req.meetingLabel());
        room.setPasswordHash(passwordEncoder.encode(req.password()));
        room.setRoomType(req.type() != null ? req.type() : RoomType.GROUP);
        room.setHostUserId(callerId);
        room = roomRepo.save(room);

        RoomMember host = new RoomMember();
        host.setRoom(room);
        host.setUserId(callerId);
        host.setNickname(req.nickname().trim());
        host.setRole(RoomRole.HOST);
        host.setRsvpStatus(RsvpStatus.GOING); // the planner is going to their own gala
        host.setHasAccount(callerHasAccount);
        memberRepo.save(host);

        // After commit: the photo package makes this gala's Drive folder (never blocks creation).
        events.publishEvent(new GalaCreatedEvent(room.getId()));

        log.info("Room created: id={}, code={}, type={}, host={}",
                room.getId(), room.getRoomCode(), room.getRoomType(), callerId);
        return RoomDto.from(room, galaClock.phaseOf(room), RoomRole.HOST, 1);
    }

    // ── Preview ("Is this the one?") ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public RoomPreviewDto previewRoom(String rawCode) {
        Room room = roomRepo.findByRoomCodeAndStatus(CodeGenerator.normalize(rawCode), Room.STATUS_ACTIVE)
                .orElseThrow(InvalidCodeException::new);
        requireNotFinished(room);

        int memberCount = (int) memberRepo.countByRoom_IdAndLeftAtIsNull(room.getId());
        List<String> nicknames = memberRepo.findTop12ByRoom_IdAndLeftAtIsNullOrderByJoinedAtAsc(room.getId())
                .stream().map(RoomMember::getNickname).toList();

        return new RoomPreviewDto(
                room.getTitle(),
                room.getDestination(),
                room.getStartDate(),
                room.getEndDate(),
                room.getRoomType(),
                memberCount,
                nicknames,
                room.isCouple() && memberCount >= COUPLE_MAX_MEMBERS);
    }

    /**
     * A gala whose dates are over can't be previewed or joined by code: its code reads as
     * expired, the same answer as an unknown one (so a finished gala leaks nothing, not even
     * that the Gala Password exists). Members still open it from My Galas.
     */
    private void requireNotFinished(Room room) {
        if (galaClock.phaseOf(room) == GalaPhase.DONE) {
            throw new InvalidCodeException();
        }
    }

    // ── Join room by code ─────────────────────────────────────────────────────

    public RoomMemberDto joinRoom(UUID callerId, boolean callerHasAccount, JoinRoomRequest req) {
        Room room = roomRepo.findByRoomCodeAndStatus(CodeGenerator.normalize(req.roomCode()), Room.STATUS_ACTIVE)
                .orElseThrow(InvalidCodeException::new);
        requireNotFinished(room);
        // Every join needs the Gala Password; a gala without one can't be joined until the
        // Gala Leader sets it in Settings.
        passwordGuard.verify(room, callerId, req.password());
        UUID roomId = room.getId();
        String nickname = req.nickname().trim();

        Optional<RoomMember> existing = memberRepo.findByRoom_IdAndUserId(roomId, callerId);
        if (existing.isPresent() && existing.get().isActive()) {
            throw new AlreadyAMemberException();
        }

        if (memberRepo.existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(roomId, nickname)) {
            throw new DuplicateNicknameException();
        }

        if (room.isCouple() && memberRepo.countByRoom_IdAndLeftAtIsNull(roomId) >= COUPLE_MAX_MEMBERS) {
            throw new RoomFullException();
        }

        // Rejoining after leaving reactivates the old row: UNIQUE(room_id, user_id)
        // allows only one row per user per room, active or not.
        RoomMember member = existing.orElseGet(RoomMember::new);
        member.setRoom(room);
        member.setUserId(callerId);
        member.setNickname(nickname);
        member.setRole(RoomRole.MEMBER);
        member.setRsvpStatus(RsvpStatus.PENDING);
        member.setTravelStatus(TravelStatus.STILL_HOME);
        member.setHasAccount(callerHasAccount);
        member.setLeftAt(null);
        member.setJoinedAt(OffsetDateTime.now());

        try {
            // saveAndFlush forces the INSERT now, inside this try — with a plain
            // save(), the class-level @Transactional defers the actual INSERT to
            // commit, so a raced unique-constraint violation would surface after
            // this method returns as an unhandled 500, not here.
            member = memberRepo.saveAndFlush(member);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            // Belt-and-suspenders: two concurrent joins raced past the check above.
            // Only the nickname index's violation means "nickname taken" — a
            // different constraint (e.g. room_id/user_id) is a different bug and
            // must not be mislabeled as DuplicateNicknameException.
            if (isNicknameIndexViolation(ex)) {
                throw new DuplicateNicknameException();
            }
            throw ex;
        }

        final RoomMemberDto dto = RoomMemberDto.from(member);
        publishAfterCommit(roomId, "member.joined", Map.of("userId", callerId, "nickname", nickname));
        chatSystem.system(roomId, nickname + " joined the gala.");
        events.publishEvent(RoomNotificationEvent.toRoom(roomId, NotificationType.SOMEONE_JOINED, callerId,
                "Someone joined", nickname + " joined " + room.getTitle() + "."));

        log.info("User {} joined room {}", callerId, roomId);
        return dto;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RoomDto getRoom(UUID roomId, UUID callerId) {
        Room room = roomRepo.findById(roomId).orElseThrow(RoomNotFoundException::new);
        RoomRole myRole = memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)
                .map(RoomMember::getRole).orElse(null);
        int memberCount = (int) memberRepo.countByRoom_IdAndLeftAtIsNull(roomId);
        return RoomDto.from(room, galaClock.phaseOf(room), myRole, memberCount);
    }

    @Transactional(readOnly = true)
    public PageResponse<RoomMemberDto> getMembers(UUID roomId, UUID cursor, int limit) {
        List<RoomMember> members = memberRepo.findActiveMembers(
                roomId, cursor, PageRequest.of(0, limit + 1));

        boolean hasMore = members.size() > limit;
        List<RoomMemberDto> page = members.stream()
                .limit(limit)
                .map(RoomMemberDto::from)
                .toList();

        String nextCursor = hasMore ? page.get(page.size() - 1).id().toString() : null;
        return PageResponse.of(page, nextCursor, limit);
    }

    // ── Remove member ─────────────────────────────────────────────────────────

    public void removeMember(UUID roomId, UUID targetUserId) {
        RoomMember member = memberRepo
                .findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, targetUserId)
                .orElseThrow(MemberNotFoundException::new);

        if (member.getRole() == RoomRole.HOST) {
            throw new ForbiddenException("Cannot remove the host from the room");
        }

        member.setLeftAt(OffsetDateTime.now());
        memberRepo.save(member);

        cacheService.evictAfterCommit(CacheKeys.roomMember(roomId, targetUserId));

        publishAfterCommit(roomId, "member.left",
                Map.of("userId", targetUserId));
    }

    // ── RSVP update ("So... who's G?") ────────────────────────────────────────

    public RoomMemberDto updateRsvp(UUID roomId, UUID callerId, UpdateRsvpRequest req) {
        RoomMember member = memberRepo
                .findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)
                .orElseThrow(NotARoomMemberException::new);

        RsvpStatus previous = member.getRsvpStatus();
        member.setRsvpStatus(req.rsvpStatus());
        member = memberRepo.save(member);

        final RoomMemberDto dto = RoomMemberDto.from(member);
        publishAfterCommit(roomId, "member.rsvp.changed",
                Map.of("userId", callerId, "status", req.rsvpStatus()));

        if (previous != req.rsvpStatus()) {
            String line = member.getNickname() + " changed their status to " + rsvpLabel(req.rsvpStatus()) + ".";
            chatSystem.system(roomId, line);
            events.publishEvent(RoomNotificationEvent.toRoom(roomId, NotificationType.ATTENDANCE_CHANGED, callerId,
                    "Attendance update", line));
        }
        return dto;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    static void validateDates(LocalDate start, LocalDate end, LocalTime startTime, LocalTime endTime) {
        if (start != null && end != null && end.isBefore(start)) {
            throw new InvalidRequestException("The end date can't be before the start date");
        }
        boolean singleDay = start != null && (end == null || end.equals(start));
        if (singleDay && startTime != null && endTime != null && endTime.isBefore(startTime)) {
            throw new InvalidRequestException("The end time can't be before the start time");
        }
    }

    /** A destination pin is both coordinates or neither (range is checked by the request's bean validation). */
    static void validatePin(Double lat, Double lng) {
        if ((lat == null) != (lng == null)) {
            throw new InvalidRequestException("Send both the latitude and the longitude of the destination, or neither");
        }
    }

    static String rsvpLabel(RsvpStatus status) {
        return switch (status) {
            case GOING -> "I'm G";
            case MAYBE -> "Maybe";
            case NOT_GOING -> "Can't make it";
            case PENDING -> "no response yet";
        };
    }

    private static boolean isNicknameIndexViolation(org.springframework.dao.DataIntegrityViolationException ex) {
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t instanceof org.hibernate.exception.ConstraintViolationException cve) {
                return "idx_room_members_room_nickname_active".equals(cve.getConstraintName());
            }
        }
        return false;
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
            String code = CodeGenerator.generate();
            if (!roomRepo.existsByRoomCode(code)) return code;
        }
        throw new IllegalStateException("Failed to generate a unique room code after " + MAX_CODE_ATTEMPTS + " attempts");
    }

    /**
     * Publishes a realtime event after the DB transaction commits.
     * This guarantees clients never receive an event for a write that rolled back.
     */
    private void publishAfterCommit(UUID roomId, String event, Object payload) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    realtime.publish(roomId, event, payload);
                }
            });
        } else {
            realtime.publish(roomId, event, payload);
        }
    }
}

package com.gala.otw_server.room.service;

import com.gala.otw_server.cache.CacheKeys;
import com.gala.otw_server.cache.CacheService;
import com.gala.otw_server.chat.service.ChatSystemMessageService;
import com.gala.otw_server.common.CodeGenerator;
import com.gala.otw_server.common.DomainExceptions.*;
import com.gala.otw_server.notification.dto.RoomNotificationEvent;
import com.gala.otw_server.notification.entity.NotificationType;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.dto.*;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.entity.RsvpStatus;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.security.auth.RoomRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
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
import java.util.UUID;

/**
 * Gala settings (leader: details, access, members, permissions, danger zone) and the
 * member's own settings (name, travel status, leave).
 */
@Service
@Transactional
public class RoomSettingsService {

    private static final Logger log = LoggerFactory.getLogger(RoomSettingsService.class);
    private static final int MAX_CODE_ATTEMPTS = 5;

    private final RoomRepository roomRepo;
    private final RoomMemberRepository memberRepo;
    private final RealtimeEventPublisher realtime;
    private final CacheService cacheService;
    private final PasswordEncoder passwordEncoder;
    private final GalaClock galaClock;
    private final ChatSystemMessageService chatSystem;
    private final ApplicationEventPublisher events;
    private final JdbcTemplate jdbc;

    public RoomSettingsService(RoomRepository roomRepo,
                               RoomMemberRepository memberRepo,
                               RealtimeEventPublisher realtime,
                               CacheService cacheService,
                               PasswordEncoder passwordEncoder,
                               GalaClock galaClock,
                               ChatSystemMessageService chatSystem,
                               ApplicationEventPublisher events,
                               JdbcTemplate jdbc) {
        this.roomRepo = roomRepo;
        this.memberRepo = memberRepo;
        this.realtime = realtime;
        this.cacheService = cacheService;
        this.passwordEncoder = passwordEncoder;
        this.galaClock = galaClock;
        this.chatSystem = chatSystem;
        this.events = events;
        this.jdbc = jdbc;
    }

    // ── Leader: gala details + "What members can do" ──────────────────────────

    public RoomDto updateRoom(UUID roomId, UpdateRoomRequest req) {
        Room room = findRoom(roomId);
        RoomService.validatePin(req.destinationLat(), req.destinationLng());

        if (req.title() != null) room.setTitle(requireText(req.title(), "Title"));
        if (req.destination() != null) {
            String destination = requireText(req.destination(), "Destination");
            // New text with no new pin: drop the old pin so it can't point at the previous place.
            if (!destination.equals(room.getDestination()) && req.destinationLat() == null) {
                room.setDestinationLat(null);
                room.setDestinationLng(null);
            }
            room.setDestination(destination);
        }
        if (req.destinationLat() != null) {
            room.setDestinationLat(req.destinationLat());
            room.setDestinationLng(req.destinationLng());
        }

        LocalDate start = req.startDate() != null ? req.startDate() : room.getStartDate();
        LocalDate end = req.endDate() != null ? req.endDate() : room.getEndDate();
        LocalTime startTime = room.getStartTime();
        LocalTime endTime = room.getEndTime();
        if (Boolean.TRUE.equals(req.clearTimes())) {
            startTime = null;
            endTime = null;
        }
        if (req.startTime() != null) startTime = req.startTime();
        if (req.endTime() != null) endTime = req.endTime();
        RoomService.validateDates(start, end, startTime, endTime);
        room.setStartDate(start);
        room.setEndDate(end);
        room.setStartTime(startTime);
        room.setEndTime(endTime);
        room.setScheduleAt(galaClock.startOf(room));

        if (req.meetingLat() != null) room.setMeetingLat(req.meetingLat());
        if (req.meetingLng() != null) room.setMeetingLng(req.meetingLng());
        if (req.meetingLabel() != null) room.setMeetingLabel(req.meetingLabel().isBlank() ? null : req.meetingLabel().trim());

        if (req.membersCanEditPlan() != null) room.setMembersCanEditPlan(req.membersCanEditPlan());
        if (req.membersCanAddPhotos() != null) room.setMembersCanAddPhotos(req.membersCanAddPhotos());
        if (req.membersCanDeleteOwnPhotos() != null) room.setMembersCanDeleteOwnPhotos(req.membersCanDeleteOwnPhotos());
        if (req.locationSharingEnabled() != null) room.setLocationSharingEnabled(req.locationSharingEnabled());
        if (req.listed() != null) room.setListed(req.listed());

        Room saved = roomRepo.save(room);
        RoomDto dto = RoomDto.from(saved, galaClock.phaseOf(saved));
        cacheService.evictAfterCommit(CacheKeys.roomOverview(roomId));
        publishAfterCommit(roomId, "room.updated", dto);
        return dto;
    }

    // ── Leader: access ────────────────────────────────────────────────────────

    public void changePassword(UUID roomId, ChangePasswordRequest req) {
        Room room = findRoom(roomId);
        room.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        roomRepo.save(room);
        log.info("Gala password changed for room {}", roomId);
    }

    /** "Make a new gala code" — the old code stops working immediately. */
    public RoomDto regenerateCode(UUID roomId) {
        Room room = findRoom(roomId);
        room.setRoomCode(generateUniqueCode());
        Room saved = roomRepo.save(room);
        RoomDto dto = RoomDto.from(saved, galaClock.phaseOf(saved));
        publishAfterCommit(roomId, "room.code.changed", Map.of("roomId", roomId, "roomCode", saved.getRoomCode()));
        return dto;
    }

    // ── Leader: danger zone ───────────────────────────────────────────────────

    /** Shelve into "Mga Drawing": read-only until revived. */
    public RoomDto archiveRoom(UUID roomId) {
        return setStatus(roomId, Room.STATUS_ARCHIVED, "room.archived");
    }

    /** "Revive it". */
    public RoomDto restoreRoom(UUID roomId) {
        return setStatus(roomId, Room.STATUS_ACTIVE, "room.restored");
    }

    /**
     * Hard delete; every room-scoped row goes with it via ON DELETE CASCADE. Photo
     * binaries stay in Google Drive — the backend's Drive access is read-only.
     */
    public void deleteRoom(UUID roomId) {
        Room room = findRoom(roomId);
        List<RoomMember> members = memberRepo.findByRoom_IdAndLeftAtIsNull(roomId);
        for (RoomMember m : members) {
            cacheService.evictAfterCommit(CacheKeys.roomMember(roomId, m.getUserId()));
        }
        cacheService.evictAfterCommit(CacheKeys.roomOverview(roomId));
        roomRepo.delete(room);
        publishAfterCommit(roomId, "room.deleted", Map.of("roomId", roomId));
        log.info("Room {} deleted by host", roomId);
    }

    // ── Leader: members ───────────────────────────────────────────────────────

    /** "Nudge" a Maybe — a realtime ping plus a notification if they have an account. */
    public void nudge(UUID roomId, UUID hostUserId, UUID targetUserId) {
        Room room = findRoom(roomId);
        RoomMember target = memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, targetUserId)
                .orElseThrow(MemberNotFoundException::new);
        if (target.getRsvpStatus() != RsvpStatus.MAYBE) {
            throw new InvalidRequestException("Only members who said Maybe can be nudged");
        }
        publishAfterCommit(roomId, "member.nudged", Map.of("userId", targetUserId));
        events.publishEvent(RoomNotificationEvent.toMember(roomId, NotificationType.NUDGE, hostUserId, targetUserId,
                "G ka na ba?", "Your Gala Leader is asking if you're coming to " + room.getTitle() + "."));
    }

    // ── Member: self ──────────────────────────────────────────────────────────

    public RoomMemberDto updateMyMembership(UUID roomId, UUID callerId, UpdateMyMembershipRequest req) {
        RoomMember me = findActiveMember(roomId, callerId);
        String nickname = req.nickname().trim();
        if (memberRepo.existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNullAndIdNot(roomId, nickname, me.getId())) {
            throw new DuplicateNicknameException();
        }
        me.setNickname(nickname);
        try {
            me = memberRepo.saveAndFlush(me);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            throw new DuplicateNicknameException();
        }
        RoomMemberDto dto = RoomMemberDto.from(me);
        publishAfterCommit(roomId, "member.updated", dto);
        return dto;
    }

    public RoomMemberDto updateTravelStatus(UUID roomId, UUID callerId, UpdateTravelStatusRequest req) {
        RoomMember me = findActiveMember(roomId, callerId);
        me.setTravelStatus(req.status());
        RoomMemberDto dto = RoomMemberDto.from(memberRepo.save(me));
        publishAfterCommit(roomId, "member.travel.changed", Map.of("userId", callerId, "status", req.status()));
        return dto;
    }

    public void leaveRoom(UUID roomId, UUID callerId) {
        RoomMember me = findActiveMember(roomId, callerId);
        if (me.getRole() == RoomRole.HOST) {
            throw new HostCannotLeaveException();
        }
        me.setLeftAt(OffsetDateTime.now());
        memberRepo.save(me);

        // Leaving also stops location sharing.
        jdbc.update("DELETE FROM member_locations WHERE room_id = ? AND user_id = ?", roomId, callerId);
        cacheService.deleteHashField(CacheKeys.roomLocations(roomId), callerId.toString());
        cacheService.evictAfterCommit(CacheKeys.roomMember(roomId, callerId));

        publishAfterCommit(roomId, "member.left", Map.of("userId", callerId));
        chatSystem.system(roomId, me.getNickname() + " left the gala.");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private RoomDto setStatus(UUID roomId, String status, String event) {
        Room room = findRoom(roomId);
        room.setStatus(status);
        Room saved = roomRepo.save(room);
        RoomDto dto = RoomDto.from(saved, galaClock.phaseOf(saved));
        cacheService.evictAfterCommit(CacheKeys.roomOverview(roomId));
        publishAfterCommit(roomId, event, Map.of("roomId", roomId, "status", status));
        return dto;
    }

    private Room findRoom(UUID roomId) {
        return roomRepo.findById(roomId).orElseThrow(RoomNotFoundException::new);
    }

    private RoomMember findActiveMember(UUID roomId, UUID userId) {
        return memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userId)
                .orElseThrow(NotARoomMemberException::new);
    }

    private static String requireText(String value, String field) {
        String trimmed = value.trim();
        if (trimmed.isEmpty()) throw new InvalidRequestException(field + " can't be blank");
        return trimmed;
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
            String code = CodeGenerator.generate();
            if (!roomRepo.existsByRoomCode(code)) return code;
        }
        throw new IllegalStateException("Failed to generate a unique room code after " + MAX_CODE_ATTEMPTS + " attempts");
    }

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

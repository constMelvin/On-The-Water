package com.gala.otw_server.room.service;

import com.gala.otw_server.common.CodeGenerator;
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
import com.gala.otw_server.security.auth.RoomRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class RoomService {

    private static final Logger log = LoggerFactory.getLogger(RoomService.class);
    private static final int MAX_CODE_ATTEMPTS = 5;

    private final RoomRepository roomRepo;
    private final RoomMemberRepository memberRepo;
    private final GroupRepository groupRepo;
    private final RealtimeEventPublisher realtime;
    private final com.gala.otw_server.cache.CacheService cacheService;

    public RoomService(RoomRepository roomRepo,
                       RoomMemberRepository memberRepo,
                       GroupRepository groupRepo,
                       RealtimeEventPublisher realtime,
                       com.gala.otw_server.cache.CacheService cacheService) {
        this.roomRepo = roomRepo;
        this.memberRepo = memberRepo;
        this.groupRepo = groupRepo;
        this.realtime = realtime;
        this.cacheService = cacheService;
    }

    // ── Create standalone room ────────────────────────────────────────────────

    public RoomDto createRoom(UUID callerId, CreateRoomRequest req) {
        return buildRoom(callerId, req, null);
    }

    // ── Create room inside a group ────────────────────────────────────────────

    public RoomDto createGroupRoom(UUID callerId, UUID groupId, CreateRoomRequest req) {
        Group group = groupRepo.findById(groupId)
                .filter(g -> "ACTIVE".equals(g.getStatus()))
                .orElseThrow(GroupNotFoundException::new);
        return buildRoom(callerId, req, group);
    }

    // ── Join room by code ─────────────────────────────────────────────────────

    public RoomMemberDto joinRoom(UUID callerId, JoinRoomRequest req) {
        Room room = roomRepo.findByRoomCodeAndStatus(req.roomCode().toUpperCase(), "ACTIVE")
                .orElseThrow(InvalidCodeException::new);

        if (memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(room.getId(), callerId)) {
            throw new AlreadyAMemberException();
        }

        RoomMember member = new RoomMember();
        member.setRoom(room);
        member.setUserId(callerId);
        member.setNickname(req.nickname());
        member.setRole(RoomRole.MEMBER);

        member = memberRepo.save(member);

        final UUID roomId = room.getId();
        final RoomMemberDto dto = RoomMemberDto.from(member);
        publishAfterCommit(roomId, "member.joined",
                Map.of("userId", callerId, "nickname", req.nickname()));

        log.info("User {} joined room {}", callerId, roomId);
        return dto;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RoomDto getRoom(UUID roomId) {
        return RoomDto.from(findActiveRoomOrThrow(roomId));
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

    @Transactional(readOnly = true)
    public PageResponse<RoomDto> getRoomsInGroup(UUID groupId, UUID cursor, int limit) {
        List<Room> rooms = roomRepo.findActiveRoomsByGroup(
                groupId, cursor, PageRequest.of(0, limit + 1));

        boolean hasMore = rooms.size() > limit;
        List<RoomDto> page = rooms.stream()
                .limit(limit)
                .map(RoomDto::from)
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

        cacheService.evictAfterCommit(com.gala.otw_server.cache.CacheKeys.roomMember(roomId, targetUserId));

        publishAfterCommit(roomId, "member.left",
                Map.of("userId", targetUserId));
    }

    // ── RSVP update ───────────────────────────────────────────────────────────

    public RoomMemberDto updateRsvp(UUID roomId, UUID callerId, UpdateRsvpRequest req) {
        RoomMember member = memberRepo
                .findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)
                .orElseThrow(NotARoomMemberException::new);

        member.setRsvpStatus(req.rsvpStatus());
        member = memberRepo.save(member);

        final RoomMemberDto dto = RoomMemberDto.from(member);
        publishAfterCommit(roomId, "member.rsvp.changed",
                Map.of("userId", callerId, "status", req.rsvpStatus()));

        return dto;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private RoomDto buildRoom(UUID callerId, CreateRoomRequest req, Group group) {
        Room room = new Room();
        room.setGroup(group);
        room.setRoomCode(generateUniqueCode());
        room.setTitle(req.title());
        room.setScheduleAt(req.scheduleAt());
        room.setMeetingLat(req.meetingLat());
        room.setMeetingLng(req.meetingLng());
        room.setMeetingLabel(req.meetingLabel());
        room.setHostUserId(callerId);
        room = roomRepo.save(room);

        RoomMember host = new RoomMember();
        host.setRoom(room);
        host.setUserId(callerId);
        host.setNickname(req.nickname());
        host.setRole(RoomRole.HOST);
        memberRepo.save(host);

        log.info("Room created: id={}, code={}, host={}, groupId={}",
                room.getId(), room.getRoomCode(), callerId,
                group != null ? group.getId() : "standalone");
        return RoomDto.from(room);
    }

    private Room findActiveRoomOrThrow(UUID roomId) {
        Room room = roomRepo.findById(roomId).orElseThrow(RoomNotFoundException::new);
        if (!"ACTIVE".equals(room.getStatus())) throw new RoomNotFoundException();
        return room;
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

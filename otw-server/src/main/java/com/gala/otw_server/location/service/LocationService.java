package com.gala.otw_server.location.service;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import com.gala.otw_server.cache.CacheKeys;
import com.gala.otw_server.cache.CacheService;
import com.gala.otw_server.common.DomainExceptions.MemberNotFoundException;
import com.gala.otw_server.common.DomainExceptions.PermissionDisabledException;
import com.gala.otw_server.room.service.GalaClock;
import com.gala.otw_server.room.service.RoomPermissionService;
import com.gala.otw_server.room.service.RoomPermissionService.Permission;
import com.gala.otw_server.common.DomainExceptions.RoomNotFoundException;
import com.gala.otw_server.location.dto.MemberLocationDto;
import com.gala.otw_server.location.dto.ShareMode;
import com.gala.otw_server.location.dto.UpdateLocationRequest;
import com.gala.otw_server.location.entity.MemberLocation;
import com.gala.otw_server.location.entity.MemberLocationId;
import com.gala.otw_server.location.repository.MemberLocationRepository;
import com.gala.otw_server.ratelimit.RateLimiterService;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class LocationService {

    private static final Logger log = LoggerFactory.getLogger(LocationService.class);
    private static final Duration SHARING_AFTER_GALA_END = Duration.ofHours(3);

    private final MemberLocationRepository locationRepo;
    private final RoomRepository roomRepo;
    private final RoomMemberRepository memberRepo;
    private final CacheService cacheService;
    private final RateLimiterService rateLimiter;
    private final RealtimeEventPublisher realtime;
    private final ObjectMapper objectMapper;
    private final RoomPermissionService permissions;
    private final GalaClock galaClock;

    public LocationService(MemberLocationRepository locationRepo,
                           RoomRepository roomRepo,
                           RoomMemberRepository memberRepo,
                           CacheService cacheService,
                           RateLimiterService rateLimiter,
                           RealtimeEventPublisher realtime,
                           ObjectMapper objectMapper,
                           RoomPermissionService permissions,
                           GalaClock galaClock) {
        this.locationRepo = locationRepo;
        this.roomRepo = roomRepo;
        this.memberRepo = memberRepo;
        this.cacheService = cacheService;
        this.rateLimiter = rateLimiter;
        this.realtime = realtime;
        this.objectMapper = objectMapper;
        this.permissions = permissions;
        this.galaClock = galaClock;
    }

    // ── Update location (PIN or LIVE) ─────────────────────────────────────────

    public MemberLocationDto updateLocation(UUID roomId, UUID callerId, UpdateLocationRequest req) {
        Room room = permissions.require(roomId, callerId, Permission.SHARE_LOCATION);
        verifyMemberOfRoom(roomId, callerId);

        // Rate limit: max 1 write per 3 seconds per user to prevent battery drain and API hammering
        rateLimiter.checkRateLimit("ratelimit:location:" + callerId, Duration.ofSeconds(3));

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime expiresAt = (req.shareMode() == ShareMode.LIVE)
                ? now.plusMinutes(2)
                : now.plusDays(30);

        // "It stops 3 hours after the gala ends."
        OffsetDateTime galaEnd = galaClock.endOf(room);
        if (galaEnd != null) {
            OffsetDateTime cutoff = galaEnd.plus(SHARING_AFTER_GALA_END);
            if (!now.isBefore(cutoff)) {
                throw new PermissionDisabledException("Location sharing closed 3 hours after the gala ended");
            }
            if (expiresAt.isAfter(cutoff)) {
                expiresAt = cutoff;
            }
        }

        MemberLocationId id = new MemberLocationId(roomId, callerId);
        MemberLocation location = locationRepo.findById(id).orElseGet(() -> {
            MemberLocation ml = new MemberLocation();
            ml.setId(id);
            ml.setRoom(room);
            return ml;
        });

        location.setLat(req.lat());
        location.setLng(req.lng());
        location.setShareMode(req.shareMode());
        location.setExpiresAt(expiresAt);

        MemberLocation saved = locationRepo.save(location);
        MemberLocationDto dto = MemberLocationDto.from(saved);

        // Ephemeral caching in Redis Hash
        saveLocationToRedis(roomId, callerId, dto);

        // Broadcast to private channel room:{roomId}
        publishAfterCommit(roomId, "location.updated", dto);

        return dto;
    }

    // ── Stop sharing location ─────────────────────────────────────────────────

    public void stopSharingLocation(UUID roomId, UUID callerId) {
        verifyActiveRoom(roomId);

        locationRepo.deleteById_RoomIdAndId_UserId(roomId, callerId);
        cacheService.deleteHashField(CacheKeys.roomLocations(roomId), callerId.toString());

        publishAfterCommit(roomId, "location.updated", Map.of(
                "userId", callerId,
                "deleted", true
        ));
    }

    // ── Get current locations ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MemberLocationDto> getLocations(UUID roomId) {
        verifyActiveRoom(roomId);

        return locationRepo.findById_RoomIdAndExpiresAtAfter(roomId, OffsetDateTime.now())
                .stream()
                .map(MemberLocationDto::from)
                .toList();
    }

    // ── Scheduled Maintenance ─────────────────────────────────────────────────

    /**
     * Purges expired LIVE location shares from Postgres every minute.
     */
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 60000)
    public void cleanupExpiredLocations() {
        int deleted = locationRepo.deleteExpiredLocations(OffsetDateTime.now());
        if (deleted > 0) {
            log.debug("Purged {} expired live location records from database", deleted);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void saveLocationToRedis(UUID roomId, UUID userId, MemberLocationDto dto) {
        try {
            String json = objectMapper.writeValueAsString(dto);
            cacheService.putHash(CacheKeys.roomLocations(roomId), userId.toString(), json);
        } catch (JacksonException e) {
            log.warn("Failed to serialize location DTO to JSON: {}", e.getMessage());
        }
    }

    /** Archived rooms stay readable; writes are already blocked by {@code RoomAccessAspect}. */
    private Room verifyActiveRoom(UUID roomId) {
        return roomRepo.findById(roomId)
                .orElseThrow(RoomNotFoundException::new);
    }

    private void verifyMemberOfRoom(UUID roomId, UUID userId) {
        boolean isMember = memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userId);
        if (!isMember) {
            throw new MemberNotFoundException();
        }
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

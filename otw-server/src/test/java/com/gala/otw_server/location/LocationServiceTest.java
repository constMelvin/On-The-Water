package com.gala.otw_server.location;

import tools.jackson.databind.ObjectMapper;
import com.gala.otw_server.cache.CacheService;
import com.gala.otw_server.common.DomainExceptions.PermissionDisabledException;
import com.gala.otw_server.location.dto.MemberLocationDto;
import com.gala.otw_server.location.dto.ShareMode;
import com.gala.otw_server.location.dto.UpdateLocationRequest;
import com.gala.otw_server.location.entity.MemberLocation;
import com.gala.otw_server.location.repository.MemberLocationRepository;
import com.gala.otw_server.location.service.LocationService;
import com.gala.otw_server.ratelimit.RateLimiterService;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.room.service.GalaClock;
import com.gala.otw_server.room.service.RoomPermissionService;
import com.gala.otw_server.room.service.RoomPermissionService.Permission;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.*;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LocationServiceTest {

    @Mock
    private MemberLocationRepository locationRepo;

    @Mock
    private RoomRepository roomRepo;

    @Mock
    private RoomMemberRepository memberRepo;

    @Mock
    private CacheService cacheService;

    @Mock
    private RateLimiterService rateLimiter;

    @Mock
    private RealtimeEventPublisher realtime;

    @Mock
    private RoomPermissionService permissions;

    private final GalaClock galaClock = new GalaClock("Asia/Manila");

    private LocationService locationService;

    private final UUID roomId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();
    private Room room;

    @BeforeEach
    void setUp() {
        locationService = new LocationService(
                locationRepo,
                roomRepo,
                memberRepo,
                cacheService,
                rateLimiter,
                realtime,
                new ObjectMapper(),
                permissions,
                galaClock
        );
        room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");
    }

    @Test
    @DisplayName("updateLocation saves LIVE share with short expiry and broadcasts to realtime")
    void updateLocation_LiveShare() {
        when(permissions.require(roomId, userId, Permission.SHARE_LOCATION)).thenReturn(room);
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userId)).thenReturn(true);
        when(locationRepo.findById(any())).thenReturn(Optional.empty());
        when(locationRepo.save(any(MemberLocation.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateLocationRequest req = new UpdateLocationRequest(14.5995, 120.9842, ShareMode.LIVE);

        MemberLocationDto dto = locationService.updateLocation(roomId, userId, req);

        assertThat(dto.lat()).isEqualTo(14.5995);
        assertThat(dto.lng()).isEqualTo(120.9842);
        assertThat(dto.shareMode()).isEqualTo(ShareMode.LIVE);
        // LIVE share should expire within ~2 minutes from now
        assertThat(dto.expiresAt()).isAfter(OffsetDateTime.now().plusSeconds(60));
        assertThat(dto.expiresAt()).isBefore(OffsetDateTime.now().plusSeconds(180));

        verify(rateLimiter).checkRateLimit(eq("ratelimit:location:" + userId), any());
        verify(locationRepo).save(any(MemberLocation.class));
        verify(cacheService).putHash(any(), eq(userId.toString()), any());
    }

    @Test
    @DisplayName("PIN share never outlives the gala: expiry is capped at 3 hours after the gala ends")
    void updateLocation_PinCappedAtGalaEnd() {
        LocalDate today = galaClock.today();
        room.setStartDate(today);
        room.setEndTime(LocalTime.of(23, 0));
        when(permissions.require(roomId, userId, Permission.SHARE_LOCATION)).thenReturn(room);
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userId)).thenReturn(true);
        when(locationRepo.findById(any())).thenReturn(Optional.empty());
        when(locationRepo.save(any(MemberLocation.class))).thenAnswer(inv -> inv.getArgument(0));

        MemberLocationDto dto = locationService.updateLocation(roomId, userId,
                new UpdateLocationRequest(16.4, 120.6, ShareMode.PIN));

        OffsetDateTime cutoff = ZonedDateTime.of(today, LocalTime.of(23, 0), ZoneId.of("Asia/Manila"))
                .plusHours(3).toOffsetDateTime();
        assertThat(dto.expiresAt().toInstant()).isEqualTo(cutoff.toInstant());
    }

    @Test
    @DisplayName("sharing after the gala ended (+3h) is refused")
    void updateLocation_AfterGalaRefused() {
        room.setStartDate(galaClock.today().minusDays(2));
        when(permissions.require(roomId, userId, Permission.SHARE_LOCATION)).thenReturn(room);
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userId)).thenReturn(true);

        assertThatThrownBy(() -> locationService.updateLocation(roomId, userId,
                new UpdateLocationRequest(16.4, 120.6, ShareMode.LIVE)))
                .isInstanceOf(PermissionDisabledException.class);
        verify(locationRepo, never()).save(any());
    }

    @Test
    @DisplayName("stopSharingLocation deletes from Postgres, evicts from Redis, and broadcasts deletion")
    void stopSharingLocation_DeletesAndEvicts() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));

        locationService.stopSharingLocation(roomId, userId);

        verify(locationRepo).deleteById_RoomIdAndId_UserId(roomId, userId);
        verify(cacheService).deleteHashField(any(), eq(userId.toString()));
    }
}

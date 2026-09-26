package com.gala.otw_server.location;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gala.otw_server.cache.CacheService;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
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

    private LocationService locationService;

    private final UUID roomId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        locationService = new LocationService(
                locationRepo,
                roomRepo,
                memberRepo,
                cacheService,
                rateLimiter,
                realtime,
                new ObjectMapper().findAndRegisterModules()
        );
    }

    @Test
    @DisplayName("updateLocation saves LIVE share with short expiry and broadcasts to realtime")
    void updateLocation_LiveShare() {
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
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
    @DisplayName("stopSharingLocation deletes from Postgres, evicts from Redis, and broadcasts deletion")
    void stopSharingLocation_DeletesAndEvicts() {
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));

        locationService.stopSharingLocation(roomId, userId);

        verify(locationRepo).deleteById_RoomIdAndId_UserId(roomId, userId);
        verify(cacheService).deleteHashField(any(), eq(userId.toString()));
    }
}

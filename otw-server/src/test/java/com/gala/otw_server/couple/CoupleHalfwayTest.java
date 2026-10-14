package com.gala.otw_server.couple;

import tools.jackson.databind.ObjectMapper;
import com.gala.otw_server.cache.CacheService;
import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;
import com.gala.otw_server.common.DomainExceptions.NotACoupleRoomException;
import com.gala.otw_server.couple.dto.HalfwayDto;
import com.gala.otw_server.couple.dto.SaveHomeRequest;
import com.gala.otw_server.couple.dto.SpotDto;
import com.gala.otw_server.couple.dto.SpotsDto;
import com.gala.otw_server.couple.entity.CoupleHomeLocation;
import com.gala.otw_server.couple.entity.SpotCategory;
import com.gala.otw_server.couple.repository.CoupleHomeLocationRepository;
import com.gala.otw_server.couple.service.CoupleHalfwayService;
import com.gala.otw_server.couple.service.GeoMath;
import com.gala.otw_server.couple.service.OverpassSpotFinder;
import com.gala.otw_server.ratelimit.RateLimiterService;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomType;
import com.gala.otw_server.room.repository.RoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.sun.net.httpserver.HttpServer;

import java.lang.reflect.Method;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CoupleHalfwayTest {

    @Mock private CoupleHomeLocationRepository homeRepo;
    @Mock private RoomRepository roomRepo;
    @Mock private OverpassSpotFinder spotFinder;
    @Mock private RealtimeEventPublisher realtime;

    private CoupleHalfwayService service;
    private final UUID roomId = UUID.randomUUID();
    private final UUID me = UUID.randomUUID();
    private final UUID partner = UUID.randomUUID();
    private Room couple;

    @BeforeEach
    void setUp() {
        service = new CoupleHalfwayService(homeRepo, roomRepo, spotFinder, realtime);
        couple = new Room();
        couple.setId(roomId);
        couple.setRoomType(RoomType.COUPLE);
    }

    private CoupleHomeLocation home(UUID user, double lat, double lng) {
        CoupleHomeLocation h = new CoupleHomeLocation(roomId, user);
        h.setLat(lat);
        h.setLng(lng);
        h.setLabel("home");
        return h;
    }

    @Test
    @DisplayName("midpoint of two points on the equator is halfway; distance is the great-circle distance")
    void geoMath() {
        double[] m = GeoMath.midpoint(0, 0, 0, 10);
        assertThat(m[0]).isCloseTo(0, org.assertj.core.data.Offset.offset(1e-9));
        assertThat(m[1]).isCloseTo(5, org.assertj.core.data.Offset.offset(1e-9));
        assertThat(GeoMath.distanceKm(0, 0, 0, 1)).isCloseTo(111.2, org.assertj.core.data.Offset.offset(0.2));
        assertThat(GeoMath.distanceKm(14.6, 121.0, 14.6, 121.0)).isZero();
    }

    @Test
    @DisplayName("with only my home saved there is no midpoint yet")
    void onlyMine() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(homeRepo.findByIdRoomId(roomId)).thenReturn(List.of(home(me, 14.6, 121.0)));

        HalfwayDto dto = service.get(roomId, me);

        assertThat(dto.mine()).isNotNull();
        assertThat(dto.partner()).isNull();
        assertThat(dto.midpoint()).isNull();
        assertThat(dto.distanceKm()).isNull();
    }

    @Test
    @DisplayName("with both homes: midpoint and distance, and the callers are told apart by user id")
    void both() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(homeRepo.findByIdRoomId(roomId)).thenReturn(List.of(home(me, 14.0, 121.0), home(partner, 16.0, 121.0)));

        HalfwayDto dto = service.get(roomId, me);

        assertThat(dto.mine().userId()).isEqualTo(me);
        assertThat(dto.partner().userId()).isEqualTo(partner);
        assertThat(dto.midpoint().lat()).isCloseTo(15.0, org.assertj.core.data.Offset.offset(0.01));
        assertThat(dto.distanceKm()).isCloseTo(222.4, org.assertj.core.data.Offset.offset(0.5));
    }

    @Test
    @DisplayName("saving a home upserts my row only and publishes an event without coordinates")
    void saveHome() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(homeRepo.findById(any())).thenReturn(Optional.empty());
        when(homeRepo.findByIdRoomId(roomId)).thenReturn(List.of());

        service.saveHome(roomId, me, new SaveHomeRequest(14.6, 121.0, "  Quezon City "));

        var saved = org.mockito.ArgumentCaptor.forClass(CoupleHomeLocation.class);
        verify(homeRepo).save(saved.capture());
        assertThat(saved.getValue().getId().getUserId()).isEqualTo(me);
        assertThat(saved.getValue().getId().getRoomId()).isEqualTo(roomId);
        assertThat(saved.getValue().getLabel()).isEqualTo("Quezon City");
        verify(realtime).publish(eq(roomId), eq("couple.home.changed"), any());
    }

    @Test
    @DisplayName("a group gala has no Halfway Checker")
    void groupRoom() {
        Room group = new Room();
        group.setId(roomId);
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(group));

        assertThatThrownBy(() -> service.get(roomId, me)).isInstanceOf(NotACoupleRoomException.class);
        verify(homeRepo, never()).save(any());
    }

    @Test
    @DisplayName("spots need both homes first")
    void spotsNeedBoth() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(homeRepo.findByIdRoomId(roomId)).thenReturn(List.of(home(me, 14.6, 121.0)));

        assertThatThrownBy(() -> service.spots(roomId, me, SpotCategory.CAFE)).isInstanceOf(InvalidRequestException.class);
        verifyNoInteractions(spotFinder);
    }

    @Test
    @DisplayName("Overpass answers become the nearest named spots, closest first")
    void parseSpots() throws Exception {
        OverpassSpotFinder finder = new OverpassSpotFinder(mock(CacheService.class), new RateLimiterService(null), new ObjectMapper(), "http://unused");
        String json = """
                {"elements":[
                  {"type":"node","lat":14.61,"lon":121.0,"tags":{"name":"Far Cafe"}},
                  {"type":"way","center":{"lat":14.601,"lon":121.0},"tags":{"name":"Near Cafe"}},
                  {"type":"node","lat":14.6,"lon":121.0,"tags":{}}
                ]}""";
        Method parse = OverpassSpotFinder.class.getDeclaredMethod("parse", String.class, SpotCategory.class, double.class, double.class);
        parse.setAccessible(true);

        @SuppressWarnings("unchecked")
        List<SpotDto> spots = (List<SpotDto>) parse.invoke(finder, json, SpotCategory.CAFE, 14.6, 121.0);

        assertThat(spots).extracting(SpotDto::name).containsExactly("Near Cafe", "Far Cafe");
        assertThat(spots.get(0).priceTier()).isEqualTo(SpotCategory.CAFE.priceTier());
    }

    // ── Overpass guards ───────────────────────────────────────────────────────

    /** A local stand-in for Overpass that counts calls and answers with {@code status}. */
    private static HttpServer fakeOverpass(int status, AtomicInteger hits) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", ex -> {
            hits.incrementAndGet();
            byte[] body = "{\"elements\":[]}".getBytes(StandardCharsets.UTF_8);
            ex.sendResponseHeaders(status, body.length);
            ex.getResponseBody().write(body);
            ex.close();
        });
        server.start();
        return server;
    }

    private static String urlOf(HttpServer server) {
        return "http://127.0.0.1:" + server.getAddress().getPort() + "/";
    }

    @Test
    @DisplayName("each account gets 20 Overpass lookups an hour; after that it's 'no suggestions', with no outside call")
    void overpassLookupsAreLimitedPerAccount() throws Exception {
        AtomicInteger hits = new AtomicInteger();
        HttpServer server = fakeOverpass(200, hits);
        try {
            OverpassSpotFinder finder = new OverpassSpotFinder(mock(CacheService.class), new RateLimiterService(null),
                    new ObjectMapper(), urlOf(server));
            for (int i = 0; i < 20; i++) {
                assertThat(finder.find(SpotCategory.CAFE, 14.6 + i * 0.01, 121.0, me).available()).isTrue();
            }
            SpotsDto refused = finder.find(SpotCategory.CAFE, 15.0, 121.0, me);

            assertThat(refused.available()).isFalse();
            assertThat(hits.get()).isEqualTo(20);
            // Someone else still gets fresh lookups.
            assertThat(finder.find(SpotCategory.CAFE, 15.0, 121.0, partner).available()).isTrue();
        } finally {
            server.stop(0);
        }
    }

    @Test
    @DisplayName("after an Overpass failure, nobody calls it again for a while")
    void overpassFailureBacksOff() throws Exception {
        AtomicInteger hits = new AtomicInteger();
        HttpServer server = fakeOverpass(429, hits);
        try {
            OverpassSpotFinder finder = new OverpassSpotFinder(mock(CacheService.class), new RateLimiterService(null),
                    new ObjectMapper(), urlOf(server));

            assertThat(finder.find(SpotCategory.CAFE, 14.6, 121.0, me).available()).isFalse();
            assertThat(finder.find(SpotCategory.PARK, 14.7, 121.0, partner).available()).isFalse();

            assertThat(hits.get()).isEqualTo(1);
        } finally {
            server.stop(0);
        }
    }
}

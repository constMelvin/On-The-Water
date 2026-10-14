package com.gala.otw_server.couple.service;

import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;
import com.gala.otw_server.common.DomainExceptions.NotACoupleRoomException;
import com.gala.otw_server.common.DomainExceptions.RoomNotFoundException;
import com.gala.otw_server.couple.dto.HalfwayDto;
import com.gala.otw_server.couple.dto.HalfwayDto.HomeDto;
import com.gala.otw_server.couple.dto.HalfwayDto.PointDto;
import com.gala.otw_server.couple.dto.SaveHomeRequest;
import com.gala.otw_server.couple.dto.SpotsDto;
import com.gala.otw_server.couple.entity.CoupleHomeLocation;
import com.gala.otw_server.couple.entity.CoupleHomeLocationId;
import com.gala.otw_server.couple.entity.SpotCategory;
import com.gala.otw_server.couple.repository.CoupleHomeLocationRepository;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.repository.RoomRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Halfway Checker: each partner saves a home, and once both have, the midpoint, the distance and nearby
 * date spots. Homes are per gala (never account-wide) and only the two people in the gala can read them.
 * The midpoint is a starting point, not necessarily the fairest place to meet.
 */
@Service
@Transactional
public class CoupleHalfwayService {

    private static final String EVENT = "couple.home.changed";

    private final CoupleHomeLocationRepository homeRepo;
    private final RoomRepository roomRepo;
    private final OverpassSpotFinder spotFinder;
    private final RealtimeEventPublisher realtime;

    public CoupleHalfwayService(CoupleHomeLocationRepository homeRepo,
                                RoomRepository roomRepo,
                                OverpassSpotFinder spotFinder,
                                RealtimeEventPublisher realtime) {
        this.homeRepo = homeRepo;
        this.roomRepo = roomRepo;
        this.spotFinder = spotFinder;
        this.realtime = realtime;
    }

    @Transactional(readOnly = true)
    public HalfwayDto get(UUID roomId, UUID callerId) {
        requireCoupleRoom(roomId);
        return build(roomId, callerId);
    }

    public HalfwayDto saveHome(UUID roomId, UUID callerId, SaveHomeRequest req) {
        requireCoupleRoom(roomId);
        CoupleHomeLocation home = homeRepo.findById(new CoupleHomeLocationId(roomId, callerId))
                .orElseGet(() -> new CoupleHomeLocation(roomId, callerId));
        home.setLat(req.lat());
        home.setLng(req.lng());
        home.setLabel(req.label() == null ? "" : req.label().trim());
        homeRepo.save(home);

        // No coordinates in the event: the other screen refetches through the API.
        publishAfterCommit(roomId, Map.of("userId", callerId));
        return build(roomId, callerId);
    }

    /** No transaction: the place lookup is a slow outside call and must not hold a database connection. */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public SpotsDto spots(UUID roomId, UUID callerId, SpotCategory category) {
        requireCoupleRoom(roomId);
        PointDto mid = build(roomId, callerId).midpoint();
        if (mid == null) {
            throw new InvalidRequestException("You both need to save a home location first");
        }
        return spotFinder.find(category, mid.lat(), mid.lng(), callerId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private HalfwayDto build(UUID roomId, UUID callerId) {
        List<CoupleHomeLocation> homes = homeRepo.findByIdRoomId(roomId);
        Optional<CoupleHomeLocation> mine = homes.stream().filter(h -> h.getId().getUserId().equals(callerId)).findFirst();
        Optional<CoupleHomeLocation> partner = homes.stream().filter(h -> !h.getId().getUserId().equals(callerId)).findFirst();

        PointDto midpoint = null;
        Double distance = null;
        if (mine.isPresent() && partner.isPresent()) {
            CoupleHomeLocation a = mine.get();
            CoupleHomeLocation b = partner.get();
            double[] m = GeoMath.midpoint(a.getLat(), a.getLng(), b.getLat(), b.getLng());
            midpoint = new PointDto(m[0], m[1]);
            distance = GeoMath.round2(GeoMath.distanceKm(a.getLat(), a.getLng(), b.getLat(), b.getLng()));
        }
        return new HalfwayDto(mine.map(CoupleHalfwayService::toDto).orElse(null),
                partner.map(CoupleHalfwayService::toDto).orElse(null), midpoint, distance);
    }

    private static HomeDto toDto(CoupleHomeLocation h) {
        return new HomeDto(h.getId().getUserId(), h.getLat(), h.getLng(), h.getLabel());
    }

    private void requireCoupleRoom(UUID roomId) {
        Room room = roomRepo.findById(roomId).orElseThrow(RoomNotFoundException::new);
        if (!room.isCouple()) throw new NotACoupleRoomException();
    }

    private void publishAfterCommit(UUID roomId, Object payload) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    realtime.publish(roomId, EVENT, payload);
                }
            });
        } else {
            realtime.publish(roomId, EVENT, payload);
        }
    }
}

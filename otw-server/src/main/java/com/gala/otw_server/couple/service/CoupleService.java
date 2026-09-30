package com.gala.otw_server.couple.service;

import com.gala.otw_server.common.DomainExceptions.NotACoupleRoomException;
import com.gala.otw_server.common.DomainExceptions.RoomNotFoundException;
import com.gala.otw_server.couple.dto.CoupleIdeaDto;
import com.gala.otw_server.couple.entity.CoupleIdea;
import com.gala.otw_server.couple.entity.CoupleSavedIdea;
import com.gala.otw_server.couple.entity.CoupleSavedIdeaId;
import com.gala.otw_server.couple.repository.CoupleSavedIdeaRepository;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.repository.RoomRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.*;

/**
 * Couple Mode's only new data: saved date ideas. Places to Go, Budget for Two and
 * Our Photos reuse the itinerary, budget and photo endpoints of the same room.
 */
@Service
@Transactional
public class CoupleService {

    private final CoupleSavedIdeaRepository savedRepo;
    private final RoomRepository roomRepo;
    private final RealtimeEventPublisher realtime;

    public CoupleService(CoupleSavedIdeaRepository savedRepo,
                         RoomRepository roomRepo,
                         RealtimeEventPublisher realtime) {
        this.savedRepo = savedRepo;
        this.roomRepo = roomRepo;
        this.realtime = realtime;
    }

    @Transactional(readOnly = true)
    public List<CoupleIdeaDto> getIdeas(UUID roomId) {
        requireCoupleRoom(roomId);
        Map<String, UUID> saved = new HashMap<>();
        for (CoupleSavedIdea s : savedRepo.findByIdRoomId(roomId)) {
            saved.put(s.getId().getIdeaKey(), s.getSavedBy());
        }
        return Arrays.stream(CoupleIdea.values())
                .map(i -> CoupleIdeaDto.of(i, saved.get(i.name())))
                .toList();
    }

    public CoupleIdeaDto saveIdea(UUID roomId, CoupleIdea idea, UUID callerId) {
        requireCoupleRoom(roomId);
        CoupleSavedIdeaId id = new CoupleSavedIdeaId(roomId, idea.name());
        CoupleSavedIdea saved = savedRepo.findById(id)
                .orElseGet(() -> savedRepo.save(new CoupleSavedIdea(id, callerId)));
        publishAfterCommit(roomId, Map.of("key", idea.name(), "saved", true));
        return CoupleIdeaDto.of(idea, saved.getSavedBy());
    }

    public CoupleIdeaDto unsaveIdea(UUID roomId, CoupleIdea idea) {
        requireCoupleRoom(roomId);
        CoupleSavedIdeaId id = new CoupleSavedIdeaId(roomId, idea.name());
        if (savedRepo.existsById(id)) {
            savedRepo.deleteById(id);
        }
        publishAfterCommit(roomId, Map.of("key", idea.name(), "saved", false));
        return CoupleIdeaDto.of(idea, null);
    }

    private void requireCoupleRoom(UUID roomId) {
        Room room = roomRepo.findById(roomId).orElseThrow(RoomNotFoundException::new);
        if (!room.isCouple()) {
            throw new NotACoupleRoomException();
        }
    }

    private void publishAfterCommit(UUID roomId, Object payload) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    realtime.publish(roomId, "couple.idea.changed", payload);
                }
            });
        } else {
            realtime.publish(roomId, "couple.idea.changed", payload);
        }
    }
}

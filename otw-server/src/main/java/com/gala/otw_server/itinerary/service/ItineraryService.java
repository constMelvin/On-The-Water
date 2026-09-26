package com.gala.otw_server.itinerary.service;

import com.gala.otw_server.common.DomainExceptions.*;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.itinerary.dto.CreateItineraryItemRequest;
import com.gala.otw_server.itinerary.dto.ItineraryItemDto;
import com.gala.otw_server.itinerary.dto.UpdateItineraryItemRequest;
import com.gala.otw_server.itinerary.entity.ItineraryItem;
import com.gala.otw_server.itinerary.repository.ItineraryItemRepository;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.security.auth.RoomRole;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class ItineraryService {

    private final ItineraryItemRepository itemRepo;
    private final RoomRepository roomRepo;
    private final RoomMemberRepository memberRepo;
    private final RealtimeEventPublisher realtime;

    public ItineraryService(ItineraryItemRepository itemRepo,
                            RoomRepository roomRepo,
                            RoomMemberRepository memberRepo,
                            RealtimeEventPublisher realtime) {
        this.itemRepo = itemRepo;
        this.roomRepo = roomRepo;
        this.memberRepo = memberRepo;
        this.realtime = realtime;
    }

    // ── Get itinerary items ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<ItineraryItemDto> getItems(UUID roomId, UUID cursor, int limit) {
        Integer cursorPosition = null;
        UUID cursorId = null;

        if (cursor != null) {
            ItineraryItem cursorItem = itemRepo.findByIdAndRoom_Id(cursor, roomId).orElse(null);
            if (cursorItem != null) {
                cursorPosition = cursorItem.getPosition();
                cursorId = cursorItem.getId();
            }
        }

        List<ItineraryItem> items = itemRepo.findItems(
                roomId,
                cursorPosition,
                cursorId,
                PageRequest.of(0, limit + 1)
        );

        boolean hasMore = items.size() > limit;
        List<ItineraryItemDto> page = items.stream()
                .limit(limit)
                .map(ItineraryItemDto::from)
                .toList();

        String nextCursor = (hasMore && !page.isEmpty())
                ? page.get(page.size() - 1).id().toString()
                : null;

        return PageResponse.of(page, nextCursor, limit);
    }

    // ── Create itinerary item ─────────────────────────────────────────────────

    public ItineraryItemDto createItem(UUID roomId, UUID callerId, CreateItineraryItemRequest req) {
        Room room = roomRepo.findById(roomId)
                .filter(r -> "ACTIVE".equals(r.getStatus()))
                .orElseThrow(RoomNotFoundException::new);

        int position = (req.position() != null)
                ? req.position()
                : itemRepo.findMaxPosition(roomId) + 1;

        ItineraryItem item = new ItineraryItem();
        item.setRoom(room);
        item.setTitle(req.title().trim());
        item.setNotes(req.notes());
        item.setStartsAt(req.startsAt());
        item.setPosition(position);
        item.setCreatedBy(callerId);
        item.setCompleted(false);

        ItineraryItem saved = itemRepo.save(item);
        ItineraryItemDto dto = ItineraryItemDto.from(saved);

        publishAfterCommit(roomId, "itinerary.created", dto);
        return dto;
    }

    // ── Edit itinerary item ───────────────────────────────────────────────────

    public ItineraryItemDto updateItem(UUID roomId, UUID itemId, UUID callerId, UpdateItineraryItemRequest req) {
        ItineraryItem item = itemRepo.findByIdAndRoom_Id(itemId, roomId)
                .orElseThrow(ItineraryItemNotFoundException::new);

        verifyEditOrDeletePermission(roomId, item, callerId);

        // Optimistic locking check: client must supply the version it read
        if (req.version() != item.getVersion()) {
            throw new OptimisticLockConflictException();
        }

        if (req.title() != null && !req.title().isBlank()) {
            item.setTitle(req.title().trim());
        }
        if (req.notes() != null) {
            item.setNotes(req.notes());
        }
        if (req.startsAt() != null) {
            item.setStartsAt(req.startsAt());
        }
        if (req.position() != null) {
            item.setPosition(req.position());
        }
        if (req.completed() != null) {
            item.setCompleted(req.completed());
        }

        ItineraryItem saved = itemRepo.save(item);
        ItineraryItemDto dto = ItineraryItemDto.from(saved);

        publishAfterCommit(roomId, "itinerary.updated", dto);
        return dto;
    }

    // ── Delete itinerary item ─────────────────────────────────────────────────

    public void deleteItem(UUID roomId, UUID itemId, UUID callerId) {
        ItineraryItem item = itemRepo.findByIdAndRoom_Id(itemId, roomId)
                .orElseThrow(ItineraryItemNotFoundException::new);

        verifyEditOrDeletePermission(roomId, item, callerId);

        itemRepo.delete(item);

        publishAfterCommit(roomId, "itinerary.deleted", Map.of(
                "id", itemId,
                "roomId", roomId
        ));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void verifyEditOrDeletePermission(UUID roomId, ItineraryItem item, UUID callerId) {
        if (item.getCreatedBy().equals(callerId)) {
            return; // Creator can edit/delete
        }

        RoomMember member = memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)
                .orElseThrow(NotARoomMemberException::new);

        if (member.getRole() != RoomRole.HOST) {
            throw new ForbiddenException("Only the item creator or the room host can modify or delete this item");
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

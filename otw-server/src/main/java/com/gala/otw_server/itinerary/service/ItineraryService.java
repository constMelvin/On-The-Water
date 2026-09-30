package com.gala.otw_server.itinerary.service;

import com.gala.otw_server.chat.service.ChatSystemMessageService;
import com.gala.otw_server.common.DomainExceptions.*;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.itinerary.dto.CreateItineraryItemRequest;
import com.gala.otw_server.itinerary.dto.ItineraryItemDto;
import com.gala.otw_server.itinerary.dto.ReorderItineraryRequest;
import com.gala.otw_server.itinerary.dto.UpdateItineraryItemRequest;
import com.gala.otw_server.itinerary.entity.ItineraryItem;
import com.gala.otw_server.itinerary.entity.StopType;
import com.gala.otw_server.itinerary.repository.ItineraryItemRepository;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.service.RoomPermissionService;
import com.gala.otw_server.room.service.RoomPermissionService.Permission;
import com.gala.otw_server.security.auth.RoomRole;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Transactional
public class ItineraryService {

    private static final DateTimeFormatter CARD_TIME = DateTimeFormatter.ofPattern("h:mm a");

    private final ItineraryItemRepository itemRepo;
    private final RoomMemberRepository memberRepo;
    private final RoomPermissionService permissions;
    private final RealtimeEventPublisher realtime;
    private final ChatSystemMessageService chatSystem;

    public ItineraryService(ItineraryItemRepository itemRepo,
                            RoomMemberRepository memberRepo,
                            RoomPermissionService permissions,
                            RealtimeEventPublisher realtime,
                            ChatSystemMessageService chatSystem) {
        this.itemRepo = itemRepo;
        this.memberRepo = memberRepo;
        this.permissions = permissions;
        this.realtime = realtime;
        this.chatSystem = chatSystem;
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

    // ── Create itinerary item ("Add a Stop") ──────────────────────────────────

    public ItineraryItemDto createItem(UUID roomId, UUID callerId, CreateItineraryItemRequest req) {
        Room room = permissions.require(roomId, callerId, Permission.EDIT_PLAN);

        int position = (req.position() != null)
                ? req.position()
                : itemRepo.findMaxPosition(roomId) + 1;

        ItineraryItem item = new ItineraryItem();
        item.setRoom(room);
        item.setTitle(req.title().trim());
        item.setNotes(req.notes());
        item.setStartsAt(req.startsAt());
        item.setStopType(req.stopType() != null ? req.stopType() : StopType.ACTIVITY);
        item.setPosition(position);
        item.setCreatedBy(callerId);
        item.setCompleted(false);

        ItineraryItem saved = itemRepo.save(item);
        ItineraryItemDto dto = ItineraryItemDto.from(saved);

        publishAfterCommit(roomId, "itinerary.created", dto);
        String when = saved.getStartsAt() != null ? " · " + saved.getStartsAt().format(CARD_TIME) : "";
        chatSystem.card(roomId, callerId, "added a new itinerary stop: " + saved.getTitle() + when,
                ChatSystemMessageService.REF_ITINERARY_ITEM, saved.getId());
        return dto;
    }

    // ── Edit itinerary item ───────────────────────────────────────────────────

    public ItineraryItemDto updateItem(UUID roomId, UUID itemId, UUID callerId, UpdateItineraryItemRequest req) {
        permissions.require(roomId, callerId, Permission.EDIT_PLAN);

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
        if (req.stopType() != null) {
            item.setStopType(req.stopType());
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

    // ── Reorder (drag-and-drop / up-down arrows) ──────────────────────────────

    /**
     * Rewrites positions 0..n-1 in one transaction. Reordering is a room-level action:
     * any member may move any stop (while "Edit the plan" is on), but only with the
     * current versions of every stop — otherwise 409 and the client refetches.
     */
    public List<ItineraryItemDto> reorder(UUID roomId, UUID callerId, ReorderItineraryRequest req) {
        permissions.require(roomId, callerId, Permission.EDIT_PLAN);

        List<ItineraryItem> current = itemRepo.findByRoom_IdOrderByPositionAscIdAsc(roomId);
        Map<UUID, ItineraryItem> byId = new HashMap<>();
        for (ItineraryItem i : current) byId.put(i.getId(), i);

        Set<UUID> requested = new HashSet<>();
        for (ReorderItineraryRequest.Item r : req.items()) requested.add(r.id());
        if (requested.size() != req.items().size() || !requested.equals(byId.keySet())) {
            // Someone added or removed a stop since this client loaded the route.
            throw new OptimisticLockConflictException();
        }

        for (ReorderItineraryRequest.Item r : req.items()) {
            if (byId.get(r.id()).getVersion() != r.version()) {
                throw new OptimisticLockConflictException();
            }
        }

        List<ItineraryItem> changed = new ArrayList<>();
        for (int pos = 0; pos < req.items().size(); pos++) {
            ItineraryItem item = byId.get(req.items().get(pos).id());
            if (item.getPosition() != pos) {
                item.setPosition(pos);
                changed.add(item);
            }
        }
        if (!changed.isEmpty()) {
            itemRepo.saveAllAndFlush(changed);
        }

        List<ItineraryItemDto> result = req.items().stream()
                .map(r -> ItineraryItemDto.from(byId.get(r.id())))
                .toList();
        publishAfterCommit(roomId, "itinerary.reordered", result.stream()
                .map(d -> Map.of("id", d.id(), "position", d.position(), "version", d.version()))
                .toList());
        return result;
    }

    // ── Delete itinerary item ─────────────────────────────────────────────────

    public void deleteItem(UUID roomId, UUID itemId, UUID callerId) {
        permissions.require(roomId, callerId, Permission.EDIT_PLAN);

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

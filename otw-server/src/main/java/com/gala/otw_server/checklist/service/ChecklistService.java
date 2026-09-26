package com.gala.otw_server.checklist.service;

import com.gala.otw_server.checklist.dto.ChecklistItemDto;
import com.gala.otw_server.checklist.dto.CreateChecklistItemRequest;
import com.gala.otw_server.checklist.dto.UpdateChecklistItemRequest;
import com.gala.otw_server.checklist.entity.ChecklistItem;
import com.gala.otw_server.checklist.repository.ChecklistItemRepository;
import com.gala.otw_server.common.DomainExceptions.*;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
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
public class ChecklistService {

    private final ChecklistItemRepository itemRepo;
    private final RoomRepository roomRepo;
    private final RoomMemberRepository memberRepo;
    private final RealtimeEventPublisher realtime;

    public ChecklistService(ChecklistItemRepository itemRepo,
                            RoomRepository roomRepo,
                            RoomMemberRepository memberRepo,
                            RealtimeEventPublisher realtime) {
        this.itemRepo = itemRepo;
        this.roomRepo = roomRepo;
        this.memberRepo = memberRepo;
        this.realtime = realtime;
    }

    // ── Get checklist items ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<ChecklistItemDto> getItems(UUID roomId, Boolean isDone, UUID cursor, int limit) {
        List<ChecklistItem> items = itemRepo.findItems(
                roomId,
                isDone,
                cursor,
                PageRequest.of(0, limit + 1)
        );

        boolean hasMore = items.size() > limit;
        List<ChecklistItemDto> page = items.stream()
                .limit(limit)
                .map(ChecklistItemDto::from)
                .toList();

        String nextCursor = (hasMore && !page.isEmpty())
                ? page.get(page.size() - 1).id().toString()
                : null;

        return PageResponse.of(page, nextCursor, limit);
    }

    // ── Create checklist item ─────────────────────────────────────────────────

    public ChecklistItemDto createItem(UUID roomId, UUID callerId, CreateChecklistItemRequest req) {
        Room room = roomRepo.findById(roomId)
                .filter(r -> "ACTIVE".equals(r.getStatus()))
                .orElseThrow(RoomNotFoundException::new);

        if (req.assignedTo() != null) {
            validateMemberOfRoom(roomId, req.assignedTo());
        }

        ChecklistItem item = new ChecklistItem();
        item.setRoom(room);
        item.setLabel(req.label().trim());
        item.setAssignedTo(req.assignedTo());
        item.setDone(false);

        ChecklistItem saved = itemRepo.save(item);
        ChecklistItemDto dto = ChecklistItemDto.from(saved);

        publishAfterCommit(roomId, "checklist.updated", dto);
        return dto;
    }

    // ── Update checklist item ─────────────────────────────────────────────────

    public ChecklistItemDto updateItem(UUID roomId, UUID itemId, UUID callerId, UpdateChecklistItemRequest req) {
        ChecklistItem item = itemRepo.findByIdAndRoom_Id(itemId, roomId)
                .orElseThrow(ChecklistItemNotFoundException::new);

        // Optimistic locking check: client must supply the version it read
        if (req.version() != item.getVersion()) {
            throw new OptimisticLockConflictException();
        }

        if (req.label() != null && !req.label().isBlank()) {
            item.setLabel(req.label().trim());
        }

        if (Boolean.TRUE.equals(req.clearAssignment())) {
            item.setAssignedTo(null);
        } else if (req.assignedTo() != null) {
            validateMemberOfRoom(roomId, req.assignedTo());
            item.setAssignedTo(req.assignedTo());
        }

        if (req.isDone() != null) {
            if (req.isDone()) {
                item.setDone(true);
                item.setDoneBy(callerId);
                item.setDoneAt(OffsetDateTime.now());
            } else {
                item.setDone(false);
                item.setDoneBy(null);
                item.setDoneAt(null);
            }
        }

        ChecklistItem saved = itemRepo.save(item);
        ChecklistItemDto dto = ChecklistItemDto.from(saved);

        publishAfterCommit(roomId, "checklist.updated", dto);
        return dto;
    }

    // ── Delete checklist item ─────────────────────────────────────────────────

    public void deleteItem(UUID roomId, UUID itemId, UUID callerId) {
        ChecklistItem item = itemRepo.findByIdAndRoom_Id(itemId, roomId)
                .orElseThrow(ChecklistItemNotFoundException::new);

        itemRepo.delete(item);

        publishAfterCommit(roomId, "checklist.updated", Map.of(
                "id", itemId,
                "roomId", roomId,
                "deleted", true
        ));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void validateMemberOfRoom(UUID roomId, UUID userId) {
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

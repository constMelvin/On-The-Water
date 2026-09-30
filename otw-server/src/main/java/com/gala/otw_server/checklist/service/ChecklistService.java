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
import com.gala.otw_server.room.service.RoomPermissionService;
import com.gala.otw_server.room.service.RoomPermissionService.Permission;
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
    private final RoomMemberRepository memberRepo;
    private final RoomPermissionService permissions;
    private final RealtimeEventPublisher realtime;

    public ChecklistService(ChecklistItemRepository itemRepo,
                            RoomMemberRepository memberRepo,
                            RoomPermissionService permissions,
                            RealtimeEventPublisher realtime) {
        this.itemRepo = itemRepo;
        this.memberRepo = memberRepo;
        this.permissions = permissions;
        this.realtime = realtime;
    }

    // ── Get checklist items (All / Mine / Done) ───────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<ChecklistItemDto> getItems(UUID roomId, Boolean isDone, UUID assignedTo, UUID cursor, int limit) {
        List<ChecklistItem> items = itemRepo.findItems(
                roomId,
                isDone,
                assignedTo,
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
        Room room = permissions.require(roomId, callerId, Permission.EDIT_PLAN);

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

    /**
     * Ticking an item done/undone is always allowed ("Tap to check"). Renaming or
     * reassigning counts as editing the plan and follows the "Edit the plan" toggle.
     */
    public ChecklistItemDto updateItem(UUID roomId, UUID itemId, UUID callerId, UpdateChecklistItemRequest req) {
        ChecklistItem item = itemRepo.findByIdAndRoom_Id(itemId, roomId)
                .orElseThrow(ChecklistItemNotFoundException::new);

        // Optimistic locking check: client must supply the version it read
        if (req.version() != item.getVersion()) {
            throw new OptimisticLockConflictException();
        }

        boolean editsPlan = (req.label() != null && !req.label().isBlank())
                || Boolean.TRUE.equals(req.clearAssignment())
                || req.assignedTo() != null;
        if (editsPlan) {
            permissions.require(roomId, callerId, Permission.EDIT_PLAN);
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

    // ── Claim ("Claim" button on unassigned items) ────────────────────────────

    public ChecklistItemDto claimItem(UUID roomId, UUID itemId, UUID callerId, int version) {
        ChecklistItem item = itemRepo.findByIdAndRoom_Id(itemId, roomId)
                .orElseThrow(ChecklistItemNotFoundException::new);

        if (version != item.getVersion()) {
            throw new OptimisticLockConflictException();
        }
        if (item.getAssignedTo() != null) {
            if (item.getAssignedTo().equals(callerId)) return ChecklistItemDto.from(item);
            throw new AlreadyClaimedException();
        }

        item.setAssignedTo(callerId);
        ChecklistItem saved = itemRepo.save(item);
        ChecklistItemDto dto = ChecklistItemDto.from(saved);

        publishAfterCommit(roomId, "checklist.updated", dto);
        return dto;
    }

    // ── Delete checklist item ─────────────────────────────────────────────────

    public void deleteItem(UUID roomId, UUID itemId, UUID callerId) {
        permissions.require(roomId, callerId, Permission.EDIT_PLAN);

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

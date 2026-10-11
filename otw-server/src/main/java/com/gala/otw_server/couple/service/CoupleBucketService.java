package com.gala.otw_server.couple.service;

import com.gala.otw_server.common.DomainExceptions.*;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.couple.dto.BucketProgressDto;
import com.gala.otw_server.couple.dto.CoupleBucketItemDto;
import com.gala.otw_server.couple.dto.CreateBucketItemRequest;
import com.gala.otw_server.couple.dto.UpdateBucketItemRequest;
import com.gala.otw_server.couple.entity.CoupleBucketItem;
import com.gala.otw_server.couple.repository.CoupleBucketItemRepository;
import com.gala.otw_server.photo.entity.Photo;
import com.gala.otw_server.photo.repository.PhotoRepository;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.room.service.RoomPermissionService;
import com.gala.otw_server.room.service.RoomPermissionService.Permission;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Our Little Bucket List: one list per couple gala. Every read and write is keyed by the gala's id, so an
 * item (or its id) from another gala can never be seen or touched here.
 * Adding, editing and removing follow the "Edit the plan" toggle (the Gala Leader is never restricted);
 * ticking an item done and attaching a memory is open to both people.
 */
@Service
@Transactional
public class CoupleBucketService {

    private static final String EVENT = "couple.bucket.changed";

    private final CoupleBucketItemRepository itemRepo;
    private final RoomRepository roomRepo;
    private final PhotoRepository photoRepo;
    private final RoomPermissionService permissions;
    private final RealtimeEventPublisher realtime;

    public CoupleBucketService(CoupleBucketItemRepository itemRepo,
                               RoomRepository roomRepo,
                               PhotoRepository photoRepo,
                               RoomPermissionService permissions,
                               RealtimeEventPublisher realtime) {
        this.itemRepo = itemRepo;
        this.roomRepo = roomRepo;
        this.photoRepo = photoRepo;
        this.permissions = permissions;
        this.realtime = realtime;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<CoupleBucketItemDto> getItems(UUID roomId, UUID cursor, int limit) {
        requireCoupleRoom(roomId);
        List<CoupleBucketItem> items = itemRepo.findPage(roomId, cursor, PageRequest.of(0, limit + 1));

        boolean hasMore = items.size() > limit;
        List<CoupleBucketItemDto> page = items.stream()
                .limit(limit)
                .map(CoupleBucketItemDto::from)
                .toList();

        String nextCursor = (hasMore && !page.isEmpty()) ? page.get(page.size() - 1).id().toString() : null;
        return PageResponse.of(page, nextCursor, limit);
    }

    @Transactional(readOnly = true)
    public BucketProgressDto getProgress(UUID roomId) {
        requireCoupleRoom(roomId);
        return new BucketProgressDto(
                itemRepo.countByRoomIdAndCompletedAtIsNotNull(roomId),
                itemRepo.countByRoomId(roomId));
    }

    // ── Create ────────────────────────────────────────────────────────────────

    public CoupleBucketItemDto createItem(UUID roomId, UUID callerId, CreateBucketItemRequest req) {
        Room room = permissions.require(roomId, callerId, Permission.EDIT_PLAN);
        requireCouple(room);

        CoupleBucketItem item = new CoupleBucketItem(roomId, callerId, req.title().trim());
        if (req.description() != null) item.setDescription(req.description().trim());
        item.setEstBudget(money(req.estBudget()));
        item.setTargetDate(req.targetDate());

        CoupleBucketItemDto dto = CoupleBucketItemDto.from(itemRepo.save(item));
        publishAfterCommit(roomId, dto);
        return dto;
    }

    // ── Update (edit / complete / memory) ─────────────────────────────────────

    public CoupleBucketItemDto updateItem(UUID roomId, UUID itemId, UUID callerId, UpdateBucketItemRequest req) {
        requireCoupleRoom(roomId);
        CoupleBucketItem item = itemRepo.findByIdAndRoomId(itemId, roomId)
                .orElseThrow(BucketItemNotFoundException::new);

        // Optimistic locking: the client must send the version it read.
        if (req.version() != item.getVersion()) {
            throw new OptimisticLockConflictException();
        }

        boolean editsItem = req.title() != null || req.description() != null || req.estBudget() != null
                || Boolean.TRUE.equals(req.clearBudget()) || req.targetDate() != null
                || Boolean.TRUE.equals(req.clearDate());
        if (editsItem) {
            permissions.require(roomId, callerId, Permission.EDIT_PLAN);
        }

        if (req.title() != null) {
            if (req.title().isBlank()) throw new InvalidRequestException("Give it a title");
            item.setTitle(req.title().trim());
        }
        if (req.description() != null) item.setDescription(req.description().trim());

        if (Boolean.TRUE.equals(req.clearBudget())) item.setEstBudget(null);
        else if (req.estBudget() != null) item.setEstBudget(money(req.estBudget()));

        if (Boolean.TRUE.equals(req.clearDate())) item.setTargetDate(null);
        else if (req.targetDate() != null) item.setTargetDate(req.targetDate());

        if (req.completed() != null) {
            if (req.completed() && !item.isCompleted()) {
                item.setCompletedAt(OffsetDateTime.now());
                item.setCompletedBy(callerId);
            } else if (!req.completed() && item.isCompleted()) {
                // Back to "not yet": the memory goes with it.
                item.setCompletedAt(null);
                item.setCompletedBy(null);
                item.setPhotoId(null);
                item.setMemory(null);
            }
        }

        boolean touchesMemory = req.photoId() != null || Boolean.TRUE.equals(req.clearPhoto()) || req.memory() != null;
        if (touchesMemory) {
            if (!item.isCompleted()) {
                throw new InvalidRequestException("Complete the item first, then add a memory");
            }
            if (Boolean.TRUE.equals(req.clearPhoto())) {
                item.setPhotoId(null);
            } else if (req.photoId() != null) {
                item.setPhotoId(requireReadyPhoto(roomId, req.photoId()).getId());
            }
            if (req.memory() != null) {
                String memory = req.memory().trim();
                item.setMemory(memory.isEmpty() ? null : memory);
            }
        }

        CoupleBucketItemDto dto = CoupleBucketItemDto.from(itemRepo.save(item));
        publishAfterCommit(roomId, dto);
        return dto;
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    public void deleteItem(UUID roomId, UUID itemId, UUID callerId) {
        Room room = permissions.require(roomId, callerId, Permission.EDIT_PLAN);
        requireCouple(room);

        CoupleBucketItem item = itemRepo.findByIdAndRoomId(itemId, roomId)
                .orElseThrow(BucketItemNotFoundException::new);
        itemRepo.delete(item);

        publishAfterCommit(roomId, Map.of("id", itemId, "roomId", roomId, "deleted", true));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Money: BigDecimal, scale 2, HALF_UP. */
    private static BigDecimal money(BigDecimal v) {
        return v == null ? null : v.setScale(2, RoundingMode.HALF_UP);
    }

    /** The memory photo must be a finished upload in THIS gala's Gala Dump. */
    private Photo requireReadyPhoto(UUID roomId, UUID photoId) {
        Photo photo = photoRepo.findByIdAndRoom_Id(photoId, roomId).orElseThrow(PhotoNotFoundException::new);
        if (!"READY".equals(photo.getStatus())) {
            throw new InvalidRequestException("That photo isn't ready yet");
        }
        return photo;
    }

    private void requireCoupleRoom(UUID roomId) {
        requireCouple(roomRepo.findById(roomId).orElseThrow(RoomNotFoundException::new));
    }

    private static void requireCouple(Room room) {
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

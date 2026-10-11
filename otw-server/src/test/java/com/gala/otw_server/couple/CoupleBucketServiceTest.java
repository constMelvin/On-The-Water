package com.gala.otw_server.couple;

import com.gala.otw_server.common.DomainExceptions.*;
import com.gala.otw_server.couple.dto.BucketProgressDto;
import com.gala.otw_server.couple.dto.CoupleBucketItemDto;
import com.gala.otw_server.couple.dto.CreateBucketItemRequest;
import com.gala.otw_server.couple.dto.UpdateBucketItemRequest;
import com.gala.otw_server.couple.entity.CoupleBucketItem;
import com.gala.otw_server.couple.repository.CoupleBucketItemRepository;
import com.gala.otw_server.couple.service.CoupleBucketService;
import com.gala.otw_server.photo.entity.Photo;
import com.gala.otw_server.photo.repository.PhotoRepository;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomType;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.room.service.RoomPermissionService;
import com.gala.otw_server.room.service.RoomPermissionService.Permission;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CoupleBucketServiceTest {

    @Mock private CoupleBucketItemRepository itemRepo;
    @Mock private RoomRepository roomRepo;
    @Mock private PhotoRepository photoRepo;
    @Mock private RoomPermissionService permissions;
    @Mock private RealtimeEventPublisher realtime;

    private CoupleBucketService service;

    private final UUID roomId = UUID.randomUUID();
    private final UUID callerId = UUID.randomUUID();
    private final UUID itemId = UUID.randomUUID();
    private Room couple;

    @BeforeEach
    void setUp() {
        service = new CoupleBucketService(itemRepo, roomRepo, photoRepo, permissions, realtime);
        couple = new Room();
        couple.setId(roomId);
        couple.setRoomType(RoomType.COUPLE);
    }

    private CoupleBucketItem existing(int version) {
        CoupleBucketItem i = new CoupleBucketItem(roomId, callerId, "Sunset hike");
        i.setId(itemId);
        i.setVersion(version);
        return i;
    }

    private static UpdateBucketItemRequest update(Boolean completed, UUID photoId, String memory, Integer version) {
        return new UpdateBucketItemRequest(null, null, null, null, null, null, completed, photoId, null, memory, version);
    }

    @Test
    @DisplayName("createItem trims text, rounds the budget to 2 places HALF_UP and saves it to this gala")
    void createItem_saves() {
        when(permissions.require(roomId, callerId, Permission.EDIT_PLAN)).thenReturn(couple);
        when(itemRepo.save(any(CoupleBucketItem.class))).thenAnswer(inv -> inv.getArgument(0));

        CoupleBucketItemDto dto = service.createItem(roomId, callerId,
                new CreateBucketItemRequest("  Stargazing ", " bring a blanket ", new BigDecimal("499.995"), null));

        assertThat(dto.roomId()).isEqualTo(roomId);
        assertThat(dto.title()).isEqualTo("Stargazing");
        assertThat(dto.description()).isEqualTo("bring a blanket");
        assertThat(dto.estBudget()).isEqualByComparingTo("500.00");
        assertThat(dto.completed()).isFalse();
        assertThat(dto.createdBy()).isEqualTo(callerId);
    }

    @Test
    @DisplayName("a group gala has no bucket list (NOT_A_COUPLE_ROOM)")
    void createItem_groupRoom() {
        Room group = new Room();
        group.setId(roomId);
        when(permissions.require(roomId, callerId, Permission.EDIT_PLAN)).thenReturn(group);

        assertThatThrownBy(() -> service.createItem(roomId, callerId,
                new CreateBucketItemRequest("Nope", null, null, null)))
                .isInstanceOf(NotACoupleRoomException.class);
        verify(itemRepo, never()).save(any());
    }

    @Test
    @DisplayName("adding is blocked when the Gala Leader turned off plan editing")
    void createItem_permissionOff() {
        when(permissions.require(roomId, callerId, Permission.EDIT_PLAN)).thenThrow(new PermissionDisabledException("off"));

        assertThatThrownBy(() -> service.createItem(roomId, callerId,
                new CreateBucketItemRequest("Nope", null, null, null)))
                .isInstanceOf(PermissionDisabledException.class);
        verify(itemRepo, never()).save(any());
    }

    @Test
    @DisplayName("an item id from another gala is not found here")
    void update_otherRoom() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(itemRepo.findByIdAndRoomId(itemId, roomId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateItem(roomId, itemId, callerId, update(true, null, null, 0)))
                .isInstanceOf(BucketItemNotFoundException.class);
    }

    @Test
    @DisplayName("a stale version is a 409, not a silent overwrite")
    void update_staleVersion() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(itemRepo.findByIdAndRoomId(itemId, roomId)).thenReturn(Optional.of(existing(3)));

        assertThatThrownBy(() -> service.updateItem(roomId, itemId, callerId, update(true, null, null, 2)))
                .isInstanceOf(OptimisticLockConflictException.class);
        verify(itemRepo, never()).save(any());
    }

    @Test
    @DisplayName("completing is open to both people (no plan-edit permission needed) and records who")
    void update_completeNeedsNoEditPermission() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(itemRepo.findByIdAndRoomId(itemId, roomId)).thenReturn(Optional.of(existing(0)));
        when(itemRepo.save(any(CoupleBucketItem.class))).thenAnswer(inv -> inv.getArgument(0));

        CoupleBucketItemDto dto = service.updateItem(roomId, itemId, callerId, update(true, null, "Sobrang ganda!", 0));

        assertThat(dto.completed()).isTrue();
        assertThat(dto.completedBy()).isEqualTo(callerId);
        assertThat(dto.memory()).isEqualTo("Sobrang ganda!");
        verify(permissions, never()).require(any(), any(), any());
    }

    @Test
    @DisplayName("editing the title follows the plan-edit permission")
    void update_editNeedsPermission() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(itemRepo.findByIdAndRoomId(itemId, roomId)).thenReturn(Optional.of(existing(0)));
        when(permissions.require(roomId, callerId, Permission.EDIT_PLAN)).thenThrow(new PermissionDisabledException("off"));

        var req = new UpdateBucketItemRequest("New title", null, null, null, null, null, null, null, null, null, 0);
        assertThatThrownBy(() -> service.updateItem(roomId, itemId, callerId, req))
                .isInstanceOf(PermissionDisabledException.class);
    }

    @Test
    @DisplayName("a memory only goes on a completed item")
    void update_memoryNeedsCompletion() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(itemRepo.findByIdAndRoomId(itemId, roomId)).thenReturn(Optional.of(existing(0)));

        assertThatThrownBy(() -> service.updateItem(roomId, itemId, callerId, update(null, null, "too early", 0)))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    @DisplayName("the memory photo must belong to this gala")
    void update_photoFromOtherGala() {
        UUID photoId = UUID.randomUUID();
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(itemRepo.findByIdAndRoomId(itemId, roomId)).thenReturn(Optional.of(existing(0)));
        when(photoRepo.findByIdAndRoom_Id(photoId, roomId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateItem(roomId, itemId, callerId, update(true, photoId, null, 0)))
                .isInstanceOf(PhotoNotFoundException.class);
        verify(itemRepo, never()).save(any());
    }

    @Test
    @DisplayName("a finished photo of this gala attaches as the memory")
    void update_attachesPhoto() {
        UUID photoId = UUID.randomUUID();
        Photo photo = new Photo();
        photo.setId(photoId);
        photo.setStatus("READY");
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(itemRepo.findByIdAndRoomId(itemId, roomId)).thenReturn(Optional.of(existing(0)));
        when(photoRepo.findByIdAndRoom_Id(photoId, roomId)).thenReturn(Optional.of(photo));
        when(itemRepo.save(any(CoupleBucketItem.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.updateItem(roomId, itemId, callerId, update(true, photoId, null, 0)).photoId())
                .isEqualTo(photoId);
    }

    @Test
    @DisplayName("un-completing clears the memory with it")
    void update_uncompleteClearsMemory() {
        CoupleBucketItem done = existing(1);
        done.setCompletedAt(java.time.OffsetDateTime.now());
        done.setCompletedBy(callerId);
        done.setMemory("nice");
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(itemRepo.findByIdAndRoomId(itemId, roomId)).thenReturn(Optional.of(done));
        when(itemRepo.save(any(CoupleBucketItem.class))).thenAnswer(inv -> inv.getArgument(0));

        CoupleBucketItemDto dto = service.updateItem(roomId, itemId, callerId, update(false, null, null, 1));

        assertThat(dto.completed()).isFalse();
        assertThat(dto.memory()).isNull();
    }

    @Test
    @DisplayName("progress counts only this gala's items")
    void progress() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(itemRepo.countByRoomIdAndCompletedAtIsNotNull(roomId)).thenReturn(3L);
        when(itemRepo.countByRoomId(roomId)).thenReturn(8L);

        BucketProgressDto p = service.getProgress(roomId);

        assertThat(p.completed()).isEqualTo(3);
        assertThat(p.total()).isEqualTo(8);
    }

    @Test
    @DisplayName("delete needs plan-edit permission and only removes this gala's item")
    void delete() {
        when(permissions.require(roomId, callerId, Permission.EDIT_PLAN)).thenReturn(couple);
        CoupleBucketItem item = existing(0);
        when(itemRepo.findByIdAndRoomId(itemId, roomId)).thenReturn(Optional.of(item));

        service.deleteItem(roomId, itemId, callerId);

        verify(itemRepo).delete(item);
    }
}

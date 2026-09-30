package com.gala.otw_server.checklist;

import com.gala.otw_server.checklist.dto.ChecklistItemDto;
import com.gala.otw_server.checklist.dto.CreateChecklistItemRequest;
import com.gala.otw_server.checklist.dto.UpdateChecklistItemRequest;
import com.gala.otw_server.checklist.entity.ChecklistItem;
import com.gala.otw_server.checklist.repository.ChecklistItemRepository;
import com.gala.otw_server.checklist.service.ChecklistService;
import com.gala.otw_server.common.DomainExceptions.AlreadyClaimedException;
import com.gala.otw_server.common.DomainExceptions.MemberNotFoundException;
import com.gala.otw_server.common.DomainExceptions.OptimisticLockConflictException;
import com.gala.otw_server.common.DomainExceptions.PermissionDisabledException;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.service.RoomPermissionService;
import com.gala.otw_server.room.service.RoomPermissionService.Permission;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChecklistServiceTest {

    @Mock
    private ChecklistItemRepository itemRepo;

    @Mock
    private RoomMemberRepository memberRepo;

    @Mock
    private RoomPermissionService permissions;

    @Mock
    private RealtimeEventPublisher realtime;

    private ChecklistService checklistService;

    private final UUID roomId = UUID.randomUUID();
    private final UUID callerId = UUID.randomUUID();
    private final UUID assigneeId = UUID.randomUUID();
    private final UUID itemId = UUID.randomUUID();
    private Room room;

    @BeforeEach
    void setUp() {
        checklistService = new ChecklistService(itemRepo, memberRepo, permissions, realtime);
        room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");
    }

    private ChecklistItem existing(int version) {
        ChecklistItem item = new ChecklistItem();
        item.setId(itemId);
        item.setRoom(room);
        item.setLabel("Bring ice");
        item.setDone(false);
        item.setVersion(version);
        return item;
    }

    @Test
    @DisplayName("createItem validates assignee is room member and saves item")
    void createItem_Success() {
        when(permissions.require(roomId, callerId, Permission.EDIT_PLAN)).thenReturn(room);
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, assigneeId)).thenReturn(true);
        when(itemRepo.save(any(ChecklistItem.class))).thenAnswer(inv -> {
            ChecklistItem item = inv.getArgument(0);
            item.setId(itemId);
            return item;
        });

        CreateChecklistItemRequest req = new CreateChecklistItemRequest("Rent Van", assigneeId);
        ChecklistItemDto result = checklistService.createItem(roomId, callerId, req);

        assertThat(result.label()).isEqualTo("Rent Van");
        assertThat(result.assignedTo()).isEqualTo(assigneeId);
        assertThat(result.isDone()).isFalse();
        verify(itemRepo).save(any(ChecklistItem.class));
    }

    @Test
    @DisplayName("createItem throws MemberNotFoundException if assignee is not a room member")
    void createItem_InvalidAssignee() {
        when(permissions.require(roomId, callerId, Permission.EDIT_PLAN)).thenReturn(room);
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, assigneeId)).thenReturn(false);

        CreateChecklistItemRequest req = new CreateChecklistItemRequest("Rent Van", assigneeId);

        assertThatThrownBy(() -> checklistService.createItem(roomId, callerId, req))
                .isInstanceOf(MemberNotFoundException.class);

        verify(itemRepo, never()).save(any());
    }

    @Test
    @DisplayName("updateItem toggling isDone sets doneBy and doneAt — allowed even with plan editing off")
    void updateItem_ToggleDone() {
        when(itemRepo.findByIdAndRoom_Id(itemId, roomId)).thenReturn(Optional.of(existing(0)));
        when(itemRepo.save(any(ChecklistItem.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateChecklistItemRequest req = new UpdateChecklistItemRequest(
                null, null, null, true, 0
        );

        ChecklistItemDto result = checklistService.updateItem(roomId, itemId, callerId, req);

        assertThat(result.isDone()).isTrue();
        assertThat(result.doneBy()).isEqualTo(callerId);
        assertThat(result.doneAt()).isNotNull();
        verifyNoInteractions(permissions);
    }

    @Test
    @DisplayName("updateItem renaming follows the 'Edit the plan' toggle")
    void updateItem_RenameNeedsPermission() {
        when(itemRepo.findByIdAndRoom_Id(itemId, roomId)).thenReturn(Optional.of(existing(0)));
        when(permissions.require(roomId, callerId, Permission.EDIT_PLAN))
                .thenThrow(new PermissionDisabledException("off"));

        assertThatThrownBy(() -> checklistService.updateItem(roomId, itemId, callerId,
                new UpdateChecklistItemRequest("New label", null, null, null, 0)))
                .isInstanceOf(PermissionDisabledException.class);
        verify(itemRepo, never()).save(any());
    }

    @Test
    @DisplayName("updateItem throws OptimisticLockConflictException on stale version")
    void updateItem_StaleVersionConflict() {
        when(itemRepo.findByIdAndRoom_Id(itemId, roomId)).thenReturn(Optional.of(existing(3)));

        // Client sent stale version 2
        UpdateChecklistItemRequest req = new UpdateChecklistItemRequest(
                null, null, null, true, 2
        );

        assertThatThrownBy(() -> checklistService.updateItem(roomId, itemId, callerId, req))
                .isInstanceOf(OptimisticLockConflictException.class);

        verify(itemRepo, never()).save(any());
    }

    @Test
    @DisplayName("claimItem assigns an unassigned item to the caller")
    void claimItem_Success() {
        when(itemRepo.findByIdAndRoom_Id(itemId, roomId)).thenReturn(Optional.of(existing(1)));
        when(itemRepo.save(any(ChecklistItem.class))).thenAnswer(inv -> inv.getArgument(0));

        ChecklistItemDto dto = checklistService.claimItem(roomId, itemId, callerId, 1);

        assertThat(dto.assignedTo()).isEqualTo(callerId);
        verify(realtime).publish(eq(roomId), eq("checklist.updated"), any());
    }

    @Test
    @DisplayName("claimItem on someone else's item is rejected with AlreadyClaimedException")
    void claimItem_AlreadyClaimed() {
        ChecklistItem item = existing(1);
        item.setAssignedTo(assigneeId);
        when(itemRepo.findByIdAndRoom_Id(itemId, roomId)).thenReturn(Optional.of(item));

        assertThatThrownBy(() -> checklistService.claimItem(roomId, itemId, callerId, 1))
                .isInstanceOf(AlreadyClaimedException.class);
        verify(itemRepo, never()).save(any());
    }

    @Test
    @DisplayName("claimItem with a stale version is rejected with 409")
    void claimItem_Stale() {
        when(itemRepo.findByIdAndRoom_Id(itemId, roomId)).thenReturn(Optional.of(existing(2)));

        assertThatThrownBy(() -> checklistService.claimItem(roomId, itemId, callerId, 1))
                .isInstanceOf(OptimisticLockConflictException.class);
    }
}

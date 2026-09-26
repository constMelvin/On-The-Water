package com.gala.otw_server.checklist;

import com.gala.otw_server.checklist.dto.ChecklistItemDto;
import com.gala.otw_server.checklist.dto.CreateChecklistItemRequest;
import com.gala.otw_server.checklist.dto.UpdateChecklistItemRequest;
import com.gala.otw_server.checklist.entity.ChecklistItem;
import com.gala.otw_server.checklist.repository.ChecklistItemRepository;
import com.gala.otw_server.checklist.service.ChecklistService;
import com.gala.otw_server.common.DomainExceptions.MemberNotFoundException;
import com.gala.otw_server.common.DomainExceptions.OptimisticLockConflictException;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
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
    private RoomRepository roomRepo;

    @Mock
    private RoomMemberRepository memberRepo;

    @Mock
    private RealtimeEventPublisher realtime;

    private ChecklistService checklistService;

    private final UUID roomId = UUID.randomUUID();
    private final UUID callerId = UUID.randomUUID();
    private final UUID assigneeId = UUID.randomUUID();
    private final UUID itemId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        checklistService = new ChecklistService(itemRepo, roomRepo, memberRepo, realtime);
    }

    @Test
    @DisplayName("createItem validates assignee is room member and saves item")
    void createItem_Success() {
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
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
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, assigneeId)).thenReturn(false);

        CreateChecklistItemRequest req = new CreateChecklistItemRequest("Rent Van", assigneeId);

        assertThatThrownBy(() -> checklistService.createItem(roomId, callerId, req))
                .isInstanceOf(MemberNotFoundException.class);

        verify(itemRepo, never()).save(any());
    }

    @Test
    @DisplayName("updateItem toggling isDone sets doneBy and doneAt")
    void updateItem_ToggleDone() {
        Room room = new Room();
        room.setId(roomId);

        ChecklistItem existing = new ChecklistItem();
        existing.setId(itemId);
        existing.setRoom(room);
        existing.setLabel("Bring ice");
        existing.setDone(false);
        existing.setVersion(0);

        when(itemRepo.findByIdAndRoom_Id(itemId, roomId)).thenReturn(Optional.of(existing));
        when(itemRepo.save(any(ChecklistItem.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateChecklistItemRequest req = new UpdateChecklistItemRequest(
                null, null, null, true, 0
        );

        ChecklistItemDto result = checklistService.updateItem(roomId, itemId, callerId, req);

        assertThat(result.isDone()).isTrue();
        assertThat(result.doneBy()).isEqualTo(callerId);
        assertThat(result.doneAt()).isNotNull();
    }

    @Test
    @DisplayName("updateItem throws OptimisticLockConflictException on stale version")
    void updateItem_StaleVersionConflict() {
        Room room = new Room();
        room.setId(roomId);

        ChecklistItem existing = new ChecklistItem();
        existing.setId(itemId);
        existing.setRoom(room);
        existing.setVersion(3);

        when(itemRepo.findByIdAndRoom_Id(itemId, roomId)).thenReturn(Optional.of(existing));

        // Client sent stale version 2
        UpdateChecklistItemRequest req = new UpdateChecklistItemRequest(
                null, null, null, true, 2
        );

        assertThatThrownBy(() -> checklistService.updateItem(roomId, itemId, callerId, req))
                .isInstanceOf(OptimisticLockConflictException.class);

        verify(itemRepo, never()).save(any());
    }
}

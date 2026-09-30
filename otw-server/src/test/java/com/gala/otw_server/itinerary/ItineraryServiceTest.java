package com.gala.otw_server.itinerary;

import com.gala.otw_server.chat.service.ChatSystemMessageService;
import com.gala.otw_server.common.DomainExceptions.ForbiddenException;
import com.gala.otw_server.common.DomainExceptions.OptimisticLockConflictException;
import com.gala.otw_server.common.DomainExceptions.PermissionDisabledException;
import com.gala.otw_server.itinerary.dto.CreateItineraryItemRequest;
import com.gala.otw_server.itinerary.dto.ItineraryItemDto;
import com.gala.otw_server.itinerary.dto.ReorderItineraryRequest;
import com.gala.otw_server.itinerary.dto.UpdateItineraryItemRequest;
import com.gala.otw_server.itinerary.entity.ItineraryItem;
import com.gala.otw_server.itinerary.entity.StopType;
import com.gala.otw_server.itinerary.repository.ItineraryItemRepository;
import com.gala.otw_server.itinerary.service.ItineraryService;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.service.RoomPermissionService;
import com.gala.otw_server.room.service.RoomPermissionService.Permission;
import com.gala.otw_server.security.auth.RoomRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ItineraryServiceTest {

    @Mock
    private ItineraryItemRepository itemRepo;

    @Mock
    private RoomMemberRepository memberRepo;

    @Mock
    private RoomPermissionService permissions;

    @Mock
    private RealtimeEventPublisher realtime;

    @Mock
    private ChatSystemMessageService chatSystem;

    private ItineraryService itineraryService;

    private final UUID roomId = UUID.randomUUID();
    private final UUID callerId = UUID.randomUUID();
    private final UUID otherUserId = UUID.randomUUID();
    private final UUID itemId = UUID.randomUUID();
    private Room room;

    @BeforeEach
    void setUp() {
        itineraryService = new ItineraryService(itemRepo, memberRepo, permissions, realtime, chatSystem);
        room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");
        lenient().when(permissions.require(roomId, callerId, Permission.EDIT_PLAN)).thenReturn(room);
    }

    private ItineraryItem item(UUID id, int position, int version, UUID createdBy) {
        ItineraryItem i = new ItineraryItem();
        i.setId(id);
        i.setRoom(room);
        i.setTitle("Stop " + position);
        i.setPosition(position);
        i.setVersion(version);
        i.setCreatedBy(createdBy);
        return i;
    }

    @Test
    @DisplayName("createItem calculates next position, stores the stop type, and posts a chat card")
    void createItem_Success() {
        when(itemRepo.findMaxPosition(roomId)).thenReturn(3);
        when(itemRepo.save(any(ItineraryItem.class))).thenAnswer(inv -> {
            ItineraryItem item = inv.getArgument(0);
            item.setId(itemId);
            return item;
        });

        CreateItineraryItemRequest req = new CreateItineraryItemRequest(
                "Strawberry Farm, La Trinidad", "Bring cash", null, StopType.ACTIVITY, null
        );

        ItineraryItemDto result = itineraryService.createItem(roomId, callerId, req);

        assertThat(result.title()).isEqualTo("Strawberry Farm, La Trinidad");
        assertThat(result.position()).isEqualTo(4);
        assertThat(result.stopType()).isEqualTo(StopType.ACTIVITY);
        assertThat(result.createdBy()).isEqualTo(callerId);
        verify(itemRepo).save(any(ItineraryItem.class));
        verify(chatSystem).card(eq(roomId), eq(callerId), anyString(),
                eq(ChatSystemMessageService.REF_ITINERARY_ITEM), eq(itemId));
    }

    @Test
    @DisplayName("createItem is refused when the host turned off plan editing")
    void createItem_PermissionDisabled() {
        when(permissions.require(roomId, callerId, Permission.EDIT_PLAN))
                .thenThrow(new PermissionDisabledException("off"));

        assertThatThrownBy(() -> itineraryService.createItem(roomId, callerId,
                new CreateItineraryItemRequest("X", null, null, null, null)))
                .isInstanceOf(PermissionDisabledException.class);
        verify(itemRepo, never()).save(any());
    }

    @Test
    @DisplayName("updateItem throws OptimisticLockConflictException when version does not match")
    void updateItem_OptimisticLockConflict() {
        ItineraryItem existing = item(itemId, 0, 2, callerId);
        when(itemRepo.findByIdAndRoom_Id(itemId, roomId)).thenReturn(Optional.of(existing));

        // Client sent stale version 1
        UpdateItineraryItemRequest req = new UpdateItineraryItemRequest(
                "Updated title", null, null, null, null, null, 1
        );

        assertThatThrownBy(() -> itineraryService.updateItem(roomId, itemId, callerId, req))
                .isInstanceOf(OptimisticLockConflictException.class);

        verify(itemRepo, never()).save(any());
    }

    @Test
    @DisplayName("updateItem throws ForbiddenException when non-creator non-host attempts to edit")
    void updateItem_ForbiddenForNonCreatorNonHost() {
        ItineraryItem existing = item(itemId, 0, 1, otherUserId);

        RoomMember member = new RoomMember();
        member.setRole(RoomRole.MEMBER); // Regular member, not host

        when(itemRepo.findByIdAndRoom_Id(itemId, roomId)).thenReturn(Optional.of(existing));
        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)).thenReturn(Optional.of(member));

        UpdateItineraryItemRequest req = new UpdateItineraryItemRequest(
                "Sneaky edit", null, null, null, null, null, 1
        );

        assertThatThrownBy(() -> itineraryService.updateItem(roomId, itemId, callerId, req))
                .isInstanceOf(ForbiddenException.class);

        verify(itemRepo, never()).save(any());
    }

    @Test
    @DisplayName("updateItem allows host to edit even if not the creator")
    void updateItem_HostCanEdit() {
        ItineraryItem existing = item(itemId, 0, 1, otherUserId);
        existing.setTitle("Old Title");

        RoomMember hostMember = new RoomMember();
        hostMember.setRole(RoomRole.HOST); // Host

        when(itemRepo.findByIdAndRoom_Id(itemId, roomId)).thenReturn(Optional.of(existing));
        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)).thenReturn(Optional.of(hostMember));
        when(itemRepo.save(any(ItineraryItem.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateItineraryItemRequest req = new UpdateItineraryItemRequest(
                "Host Updated Title", null, null, StopType.FOOD, null, null, 1
        );

        ItineraryItemDto result = itineraryService.updateItem(roomId, itemId, callerId, req);

        assertThat(result.title()).isEqualTo("Host Updated Title");
        assertThat(result.stopType()).isEqualTo(StopType.FOOD);
        verify(itemRepo).save(existing);
    }

    // ── Reorder ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("reorder rewrites positions 0..n-1 for any member, even for stops they didn't add")
    void reorder_Success() {
        UUID a = UUID.randomUUID(), b = UUID.randomUUID(), c = UUID.randomUUID();
        ItineraryItem ia = item(a, 0, 1, otherUserId);
        ItineraryItem ib = item(b, 1, 1, otherUserId);
        ItineraryItem ic = item(c, 2, 1, otherUserId);
        when(itemRepo.findByRoom_IdOrderByPositionAscIdAsc(roomId)).thenReturn(List.of(ia, ib, ic));

        List<ItineraryItemDto> result = itineraryService.reorder(roomId, callerId, new ReorderItineraryRequest(List.of(
                new ReorderItineraryRequest.Item(c, 1),
                new ReorderItineraryRequest.Item(a, 1),
                new ReorderItineraryRequest.Item(b, 1))));

        assertThat(result).extracting(ItineraryItemDto::id).containsExactly(c, a, b);
        assertThat(ic.getPosition()).isEqualTo(0);
        assertThat(ia.getPosition()).isEqualTo(1);
        assertThat(ib.getPosition()).isEqualTo(2);
        verify(itemRepo).saveAllAndFlush(anyList());
        verify(realtime).publish(eq(roomId), eq("itinerary.reordered"), any());
    }

    @Test
    @DisplayName("reorder with a stale version is rejected with 409")
    void reorder_StaleVersion() {
        UUID a = UUID.randomUUID(), b = UUID.randomUUID();
        when(itemRepo.findByRoom_IdOrderByPositionAscIdAsc(roomId))
                .thenReturn(List.of(item(a, 0, 3, callerId), item(b, 1, 1, callerId)));

        assertThatThrownBy(() -> itineraryService.reorder(roomId, callerId, new ReorderItineraryRequest(List.of(
                new ReorderItineraryRequest.Item(b, 1),
                new ReorderItineraryRequest.Item(a, 2)))))
                .isInstanceOf(OptimisticLockConflictException.class);
        verify(itemRepo, never()).saveAllAndFlush(anyList());
    }

    @Test
    @DisplayName("reorder with a missing stop (someone added one meanwhile) is rejected with 409")
    void reorder_ListMismatch() {
        UUID a = UUID.randomUUID(), b = UUID.randomUUID();
        when(itemRepo.findByRoom_IdOrderByPositionAscIdAsc(roomId))
                .thenReturn(List.of(item(a, 0, 1, callerId), item(b, 1, 1, callerId)));

        assertThatThrownBy(() -> itineraryService.reorder(roomId, callerId, new ReorderItineraryRequest(List.of(
                new ReorderItineraryRequest.Item(a, 1)))))
                .isInstanceOf(OptimisticLockConflictException.class);
    }

    @Test
    @DisplayName("reorder with the same stop twice is rejected with 409")
    void reorder_Duplicate() {
        UUID a = UUID.randomUUID(), b = UUID.randomUUID();
        when(itemRepo.findByRoom_IdOrderByPositionAscIdAsc(roomId))
                .thenReturn(List.of(item(a, 0, 1, callerId), item(b, 1, 1, callerId)));

        assertThatThrownBy(() -> itineraryService.reorder(roomId, callerId, new ReorderItineraryRequest(List.of(
                new ReorderItineraryRequest.Item(a, 1),
                new ReorderItineraryRequest.Item(a, 1)))))
                .isInstanceOf(OptimisticLockConflictException.class);
    }
}

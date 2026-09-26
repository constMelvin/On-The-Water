package com.gala.otw_server.itinerary;

import com.gala.otw_server.common.DomainExceptions.ForbiddenException;
import com.gala.otw_server.common.DomainExceptions.OptimisticLockConflictException;
import com.gala.otw_server.itinerary.dto.CreateItineraryItemRequest;
import com.gala.otw_server.itinerary.dto.ItineraryItemDto;
import com.gala.otw_server.itinerary.dto.UpdateItineraryItemRequest;
import com.gala.otw_server.itinerary.entity.ItineraryItem;
import com.gala.otw_server.itinerary.repository.ItineraryItemRepository;
import com.gala.otw_server.itinerary.service.ItineraryService;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.security.auth.RoomRole;
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
class ItineraryServiceTest {

    @Mock
    private ItineraryItemRepository itemRepo;

    @Mock
    private RoomRepository roomRepo;

    @Mock
    private RoomMemberRepository memberRepo;

    @Mock
    private RealtimeEventPublisher realtime;

    private ItineraryService itineraryService;

    private final UUID roomId = UUID.randomUUID();
    private final UUID callerId = UUID.randomUUID();
    private final UUID otherUserId = UUID.randomUUID();
    private final UUID itemId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        itineraryService = new ItineraryService(itemRepo, roomRepo, memberRepo, realtime);
    }

    @Test
    @DisplayName("createItem calculates next position and persists item")
    void createItem_Success() {
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(itemRepo.findMaxPosition(roomId)).thenReturn(3);
        when(itemRepo.save(any(ItineraryItem.class))).thenAnswer(inv -> {
            ItineraryItem item = inv.getArgument(0);
            item.setId(itemId);
            return item;
        });

        CreateItineraryItemRequest req = new CreateItineraryItemRequest(
                "Island Hopping", "Bring towels", null, null
        );

        ItineraryItemDto result = itineraryService.createItem(roomId, callerId, req);

        assertThat(result.title()).isEqualTo("Island Hopping");
        assertThat(result.position()).isEqualTo(4);
        assertThat(result.createdBy()).isEqualTo(callerId);
        verify(itemRepo).save(any(ItineraryItem.class));
    }

    @Test
    @DisplayName("updateItem throws OptimisticLockConflictException when version does not match")
    void updateItem_OptimisticLockConflict() {
        Room room = new Room();
        room.setId(roomId);

        ItineraryItem existing = new ItineraryItem();
        existing.setId(itemId);
        existing.setRoom(room);
        existing.setCreatedBy(callerId);
        existing.setVersion(2);

        when(itemRepo.findByIdAndRoom_Id(itemId, roomId)).thenReturn(Optional.of(existing));

        // Client sent stale version 1
        UpdateItineraryItemRequest req = new UpdateItineraryItemRequest(
                "Updated title", null, null, null, null, 1
        );

        assertThatThrownBy(() -> itineraryService.updateItem(roomId, itemId, callerId, req))
                .isInstanceOf(OptimisticLockConflictException.class);

        verify(itemRepo, never()).save(any());
    }

    @Test
    @DisplayName("updateItem throws ForbiddenException when non-creator non-host attempts to edit")
    void updateItem_ForbiddenForNonCreatorNonHost() {
        Room room = new Room();
        room.setId(roomId);

        ItineraryItem existing = new ItineraryItem();
        existing.setId(itemId);
        existing.setRoom(room);
        existing.setCreatedBy(otherUserId); // created by someone else
        existing.setVersion(1);

        RoomMember member = new RoomMember();
        member.setRole(RoomRole.MEMBER); // Regular member, not host

        when(itemRepo.findByIdAndRoom_Id(itemId, roomId)).thenReturn(Optional.of(existing));
        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)).thenReturn(Optional.of(member));

        UpdateItineraryItemRequest req = new UpdateItineraryItemRequest(
                "Sneaky edit", null, null, null, null, 1
        );

        assertThatThrownBy(() -> itineraryService.updateItem(roomId, itemId, callerId, req))
                .isInstanceOf(ForbiddenException.class);

        verify(itemRepo, never()).save(any());
    }

    @Test
    @DisplayName("updateItem allows host to edit even if not the creator")
    void updateItem_HostCanEdit() {
        Room room = new Room();
        room.setId(roomId);

        ItineraryItem existing = new ItineraryItem();
        existing.setId(itemId);
        existing.setRoom(room);
        existing.setCreatedBy(otherUserId);
        existing.setTitle("Old Title");
        existing.setVersion(1);

        RoomMember hostMember = new RoomMember();
        hostMember.setRole(RoomRole.HOST); // Host

        when(itemRepo.findByIdAndRoom_Id(itemId, roomId)).thenReturn(Optional.of(existing));
        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)).thenReturn(Optional.of(hostMember));
        when(itemRepo.save(any(ItineraryItem.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateItineraryItemRequest req = new UpdateItineraryItemRequest(
                "Host Updated Title", null, null, null, null, 1
        );

        ItineraryItemDto result = itineraryService.updateItem(roomId, itemId, callerId, req);

        assertThat(result.title()).isEqualTo("Host Updated Title");
        verify(itemRepo).save(existing);
    }
}

package com.gala.otw_server.couple;

import com.gala.otw_server.common.DomainExceptions.NotACoupleRoomException;
import com.gala.otw_server.couple.dto.CoupleIdeaDto;
import com.gala.otw_server.couple.entity.CoupleIdea;
import com.gala.otw_server.couple.entity.CoupleSavedIdea;
import com.gala.otw_server.couple.entity.CoupleSavedIdeaId;
import com.gala.otw_server.couple.repository.CoupleSavedIdeaRepository;
import com.gala.otw_server.couple.service.CoupleService;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomType;
import com.gala.otw_server.room.repository.RoomRepository;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CoupleServiceTest {

    @Mock private CoupleSavedIdeaRepository savedRepo;
    @Mock private RoomRepository roomRepo;
    @Mock private RealtimeEventPublisher realtime;

    private CoupleService service;
    private final UUID roomId = UUID.randomUUID();
    private final UUID me = UUID.randomUUID();
    private Room room;

    @BeforeEach
    void setUp() {
        service = new CoupleService(savedRepo, roomRepo, realtime);
        room = new Room();
        room.setId(roomId);
        room.setRoomType(RoomType.COUPLE);
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
    }

    @Test
    @DisplayName("getIdeas returns the whole catalog with this couple's saved flags")
    void getIdeas() {
        when(savedRepo.findByIdRoomId(roomId)).thenReturn(List.of(
                new CoupleSavedIdea(new CoupleSavedIdeaId(roomId, CoupleIdea.COFFEE_CRAWL.name()), me)));

        List<CoupleIdeaDto> ideas = service.getIdeas(roomId);

        assertThat(ideas).hasSize(CoupleIdea.values().length);
        assertThat(ideas).filteredOn(CoupleIdeaDto::saved).extracting(CoupleIdeaDto::key)
                .containsExactly(CoupleIdea.COFFEE_CRAWL);
    }

    @Test
    @DisplayName("saveIdea hearts an idea and broadcasts the change")
    void saveIdea() {
        when(savedRepo.findById(any())).thenReturn(Optional.empty());
        when(savedRepo.save(any(CoupleSavedIdea.class))).thenAnswer(inv -> inv.getArgument(0));

        CoupleIdeaDto dto = service.saveIdea(roomId, CoupleIdea.PICNIC_WITH_A_PLAYLIST, me);

        assertThat(dto.saved()).isTrue();
        assertThat(dto.savedBy()).isEqualTo(me);
        verify(realtime).publish(eq(roomId), eq("couple.idea.changed"), any());
    }

    @Test
    @DisplayName("couple endpoints on a group gala are 404 NOT_A_COUPLE_ROOM")
    void groupRoomRejected() {
        room.setRoomType(RoomType.GROUP);

        assertThatThrownBy(() -> service.getIdeas(roomId)).isInstanceOf(NotACoupleRoomException.class);
        verifyNoInteractions(savedRepo);
    }
}

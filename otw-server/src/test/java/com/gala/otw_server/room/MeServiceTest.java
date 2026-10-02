package com.gala.otw_server.room;

import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.room.dto.MyRoomDto;
import com.gala.otw_server.room.entity.GalaPhase;
import com.gala.otw_server.room.entity.RoomType;
import com.gala.otw_server.room.repository.MyRoomQueryRepository;
import com.gala.otw_server.room.repository.MyRoomQueryRepository.Row;
import com.gala.otw_server.room.repository.MyRoomQueryRepository.View;
import com.gala.otw_server.room.service.GalaClock;
import com.gala.otw_server.room.service.MeService;
import com.gala.otw_server.security.auth.RoomRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.*;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MeServiceTest {

    @Mock private MyRoomQueryRepository query;

    private final GalaClock clock = new GalaClock(
            Clock.fixed(Instant.parse("2026-09-29T01:41:00Z"), ZoneId.of("Asia/Manila")));
    private MeService service;
    private final UUID me = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new MeService(query, clock);
    }

    private Row row(String title, LocalDate start) {
        return new Row(UUID.randomUUID(), "ABCD2345", title, "Somewhere", start, null, RoomType.GROUP, "ACTIVE", RoomRole.MEMBER, 5);
    }

    @Test
    @DisplayName("getMyRooms pages with an offset cursor and computes each gala's phase")
    void pages() {
        LocalDate today = LocalDate.of(2026, 9, 29);
        when(query.findByView(me, View.UPCOMING, today, 0, 3))
                .thenReturn(List.of(row("Tagaytay", LocalDate.of(2026, 10, 10)),
                        row("Baguio", LocalDate.of(2026, 11, 14)),
                        row("Extra", LocalDate.of(2026, 12, 1))));

        PageResponse<MyRoomDto> page = service.getMyRooms(me, View.UPCOMING, null, 2);

        assertThat(page.items()).extracting(MyRoomDto::title).containsExactly("Tagaytay", "Baguio");
        assertThat(page.items()).allSatisfy(r -> assertThat(r.phase()).isEqualTo(GalaPhase.PLANNING));
        assertThat(page.items()).extracting(MyRoomDto::roomCode).containsOnly("ABCD2345");
        assertThat(page.nextCursor()).isEqualTo("2");
    }

    @Test
    @DisplayName("calendar ranges over ~2 months or backwards are rejected")
    void rangeValidation() {
        assertThatThrownBy(() -> service.getMyRoomsInRange(me, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 6, 1), null, 20))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> service.getMyRoomsInRange(me, LocalDate.of(2026, 2, 1), LocalDate.of(2026, 1, 1), null, 20))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    @DisplayName("a garbage cursor is a 400, not a 500")
    void badCursor() {
        assertThatThrownBy(() -> service.getMyRooms(me, View.UPCOMING, "abc", 20))
                .isInstanceOf(InvalidRequestException.class);
    }
}

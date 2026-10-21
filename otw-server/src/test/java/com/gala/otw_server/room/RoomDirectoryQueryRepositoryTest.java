package com.gala.otw_server.room;

import com.gala.otw_server.TestcontainersConfiguration;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.repository.RoomDirectoryQueryRepository;
import com.gala.otw_server.room.repository.RoomDirectoryQueryRepository.Row;
import com.gala.otw_server.room.repository.RoomRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.testcontainers.DockerClientFactory;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Needs Docker (a real PostgreSQL); skipped where there is none. */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({TestcontainersConfiguration.class, RoomDirectoryQueryRepository.class})
@EnabledIf("isDockerAvailable")
class RoomDirectoryQueryRepositoryTest {

    static boolean isDockerAvailable() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable t) {
            return false;
        }
    }

    private static final LocalDate TODAY = LocalDate.of(2026, 9, 29);

    @Autowired
    private RoomDirectoryQueryRepository directory;

    @Autowired
    private RoomRepository roomRepo;

    private void room(String title, LocalDate start, LocalDate end) {
        Room room = new Room();
        room.setRoomCode("R" + UUID.randomUUID().toString().substring(0, 7).toUpperCase());
        room.setTitle(title);
        room.setHostUserId(UUID.randomUUID());
        room.setStartDate(start);
        room.setEndDate(end);
        roomRepo.saveAndFlush(room);
    }

    @Test
    @DisplayName("the directory lists galas that haven't finished and leaves out the ones that have")
    void leavesOutFinishedGalas() {
        room("Dir-ended-yesterday", LocalDate.of(2026, 9, 20), LocalDate.of(2026, 9, 28));
        room("Dir-one-day-yesterday", LocalDate.of(2026, 9, 28), null);
        room("Dir-ends-today", LocalDate.of(2026, 9, 27), TODAY);
        room("Dir-one-day-today", TODAY, null);
        room("Dir-upcoming", LocalDate.of(2026, 10, 5), null);

        List<Row> rows = directory.find(UUID.randomUUID(), TODAY, "Dir-", 0, 50);

        assertThat(rows).extracting(Row::title)
                .containsExactly("Dir-ends-today", "Dir-one-day-today", "Dir-upcoming");
    }
}

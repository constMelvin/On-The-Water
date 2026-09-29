package com.gala.otw_server.room;

import com.gala.otw_server.TestcontainersConfiguration;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.security.auth.RoomRole;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.testcontainers.DockerClientFactory;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
@EnabledIf("isDockerAvailable")
class RoomMemberRepositoryTest {

    static boolean isDockerAvailable() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable t) {
            return false;
        }
    }

    @Autowired
    private RoomMemberRepository memberRepo;

    @Autowired
    private RoomRepository roomRepo;

    private Room persistRoom() {
        Room room = new Room();
        room.setRoomCode("R" + UUID.randomUUID().toString().substring(0, 7).toUpperCase());
        room.setTitle("Test Gala");
        room.setHostUserId(UUID.randomUUID());
        return roomRepo.saveAndFlush(room);
    }

    private RoomMember member(Room room, String nickname) {
        RoomMember m = new RoomMember();
        m.setRoom(room);
        m.setUserId(UUID.randomUUID());
        m.setNickname(nickname);
        m.setRole(RoomRole.MEMBER);
        return m;
    }

    @Test
    void secondActiveMemberWithSameNicknameCaseInsensitive_violatesUniqueIndex() {
        Room room = persistRoom();
        memberRepo.saveAndFlush(member(room, "Miguel"));

        assertThatThrownBy(() -> memberRepo.saveAndFlush(member(room, "miguel")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void nicknameFreedByALeftMember_canBeReusedByANewActiveMember() {
        Room room = persistRoom();
        RoomMember left = member(room, "Miguel");
        left.setLeftAt(OffsetDateTime.now());
        memberRepo.saveAndFlush(left);

        RoomMember rejoined = memberRepo.saveAndFlush(member(room, "Miguel"));

        assertThat(rejoined.getId()).isNotNull();
    }
}

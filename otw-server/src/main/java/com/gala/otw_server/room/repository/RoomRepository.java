package com.gala.otw_server.room.repository;

import com.gala.otw_server.room.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomRepository extends JpaRepository<Room, UUID> {

    Optional<Room> findByRoomCodeAndStatus(String roomCode, String status);

    boolean existsByRoomCode(String roomCode);
}

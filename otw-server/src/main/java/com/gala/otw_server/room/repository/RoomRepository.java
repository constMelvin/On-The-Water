package com.gala.otw_server.room.repository;

import com.gala.otw_server.room.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomRepository extends JpaRepository<Room, UUID> {

    Optional<Room> findByRoomCodeAndStatus(String roomCode, String status);

    boolean existsByRoomCode(String roomCode);

    /** List rooms inside a group — used by GET /groups/{groupId}/rooms. */
    @Query("""
            SELECT r FROM Room r
            WHERE r.group.id = :groupId
              AND r.status = 'ACTIVE'
              AND (:cursor IS NULL OR r.id > :cursor)
            ORDER BY r.createdAt DESC, r.id DESC
            """)
    List<Room> findActiveRoomsByGroup(
            @Param("groupId") UUID groupId,
            @Param("cursor") UUID cursor,
            org.springframework.data.domain.Pageable pageable);
}

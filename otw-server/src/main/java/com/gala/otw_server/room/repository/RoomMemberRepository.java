package com.gala.otw_server.room.repository;

import com.gala.otw_server.room.entity.RoomMember;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomMemberRepository extends JpaRepository<RoomMember, UUID> {

    Optional<RoomMember> findByRoom_IdAndUserIdAndLeftAtIsNull(UUID roomId, UUID userId);

    boolean existsByRoom_IdAndUserIdAndLeftAtIsNull(UUID roomId, UUID userId);

    boolean existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(UUID roomId, String nickname);

    List<RoomMember> findByRoom_IdAndLeftAtIsNull(UUID roomId);

    /** Paginated member list for a room. */
    @Query("""
            SELECT m FROM RoomMember m
            WHERE m.room.id = :roomId
              AND m.leftAt IS NULL
              AND (:cursor IS NULL OR m.id > :cursor)
            ORDER BY m.joinedAt ASC, m.id ASC
            """)
    List<RoomMember> findActiveMembers(
            @Param("roomId") UUID roomId,
            @Param("cursor") UUID cursor,
            Pageable pageable);
}

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

    /** Active or left — UNIQUE(room_id, user_id) means there is at most one row. */
    Optional<RoomMember> findByRoom_IdAndUserId(UUID roomId, UUID userId);

    Optional<RoomMember> findByIdAndRoom_Id(UUID id, UUID roomId);

    boolean existsByRoom_IdAndUserIdAndLeftAtIsNull(UUID roomId, UUID userId);

    boolean existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNull(UUID roomId, String nickname);

    boolean existsByRoom_IdAndNicknameIgnoreCaseAndLeftAtIsNullAndIdNot(UUID roomId, String nickname, UUID id);

    long countByRoom_IdAndLeftAtIsNull(UUID roomId);

    List<RoomMember> findByRoom_IdAndLeftAtIsNull(UUID roomId);

    /** Join preview nicknames. */
    List<RoomMember> findTop12ByRoom_IdAndLeftAtIsNullOrderByJoinedAtAsc(UUID roomId);

    /** "Which one are you?" picker — bounded; galas are small. */
    List<RoomMember> findTop100ByRoom_IdAndLeftAtIsNullOrderByJoinedAtAsc(UUID roomId);

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

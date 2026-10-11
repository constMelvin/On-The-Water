package com.gala.otw_server.profile.repository;

import com.gala.otw_server.profile.entity.UserProfile;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, UUID> {

    /** Saved profiles of the room's ACTIVE members only (members who never saved one have no row). */
    @Query("""
            SELECT p FROM UserProfile p, RoomMember m
            WHERE m.userId = p.userId
              AND m.room.id = :roomId
              AND m.leftAt IS NULL
              AND (:cursor IS NULL OR p.userId > :cursor)
            ORDER BY p.userId ASC
            """)
    List<UserProfile> findForActiveMembers(
            @Param("roomId") UUID roomId,
            @Param("cursor") UUID cursor,
            Pageable pageable);
}

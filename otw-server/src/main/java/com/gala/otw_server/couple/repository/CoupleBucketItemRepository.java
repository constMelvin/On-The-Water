package com.gala.otw_server.couple.repository;

import com.gala.otw_server.couple.entity.CoupleBucketItem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CoupleBucketItemRepository extends JpaRepository<CoupleBucketItem, UUID> {

    /** Always filter by room: an item id from another gala must never resolve here. */
    Optional<CoupleBucketItem> findByIdAndRoomId(UUID id, UUID roomId);

    /** One gala's list, oldest first, cursor-paged on the item id (rule: no unbounded collections). */
    @Query("""
            SELECT i FROM CoupleBucketItem i
            WHERE i.roomId = :roomId
              AND (:cursor IS NULL OR i.id > :cursor)
            ORDER BY i.id ASC
            """)
    List<CoupleBucketItem> findPage(@Param("roomId") UUID roomId, @Param("cursor") UUID cursor, Pageable pageable);

    long countByRoomId(UUID roomId);

    long countByRoomIdAndCompletedAtIsNotNull(UUID roomId);
}

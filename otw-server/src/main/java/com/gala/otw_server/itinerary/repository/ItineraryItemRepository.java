package com.gala.otw_server.itinerary.repository;

import com.gala.otw_server.itinerary.entity.ItineraryItem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ItineraryItemRepository extends JpaRepository<ItineraryItem, UUID> {

    Optional<ItineraryItem> findByIdAndRoom_Id(UUID id, UUID roomId);

    @Query("""
            SELECT i FROM ItineraryItem i
            WHERE i.room.id = :roomId
              AND (:cursorPosition IS NULL OR i.position > :cursorPosition OR (i.position = :cursorPosition AND i.id > :cursorId))
            ORDER BY i.position ASC, i.id ASC
            """)
    List<ItineraryItem> findItems(
            @Param("roomId") UUID roomId,
            @Param("cursorPosition") Integer cursorPosition,
            @Param("cursorId") UUID cursorId,
            Pageable pageable);

    @Query("SELECT COALESCE(MAX(i.position), 0) FROM ItineraryItem i WHERE i.room.id = :roomId")
    int findMaxPosition(@Param("roomId") UUID roomId);
}

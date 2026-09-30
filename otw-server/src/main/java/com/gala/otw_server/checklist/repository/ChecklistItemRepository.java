package com.gala.otw_server.checklist.repository;

import com.gala.otw_server.checklist.entity.ChecklistItem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, UUID> {

    Optional<ChecklistItem> findByIdAndRoom_Id(UUID id, UUID roomId);

    @Query("""
            SELECT c FROM ChecklistItem c
            WHERE c.room.id = :roomId
              AND (:isDone IS NULL OR c.done = :isDone)
              AND (:assignedTo IS NULL OR c.assignedTo = :assignedTo)
              AND (:cursor IS NULL OR c.id > :cursor)
            ORDER BY c.createdAt ASC, c.id ASC
            """)
    List<ChecklistItem> findItems(
            @Param("roomId") UUID roomId,
            @Param("isDone") Boolean isDone,
            @Param("assignedTo") UUID assignedTo,
            @Param("cursor") UUID cursor,
            Pageable pageable);
}

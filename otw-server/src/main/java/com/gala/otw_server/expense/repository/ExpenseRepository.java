package com.gala.otw_server.expense.repository;

import com.gala.otw_server.expense.entity.Expense;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    Optional<Expense> findByIdAndRoom_Id(UUID id, UUID roomId);

    @Query("""
            SELECT e FROM Expense e
            WHERE e.room.id = :roomId
              AND (:cursor IS NULL OR e.id > :cursor)
            ORDER BY e.createdAt DESC, e.id DESC
            """)
    List<Expense> findExpenses(
            @Param("roomId") UUID roomId,
            @Param("cursor") UUID cursor,
            Pageable pageable);

    @Query("""
            SELECT DISTINCT e FROM Expense e
            LEFT JOIN FETCH e.shares
            WHERE e.room.id = :roomId
            """)
    List<Expense> findAllWithSharesByRoomId(@Param("roomId") UUID roomId);
}

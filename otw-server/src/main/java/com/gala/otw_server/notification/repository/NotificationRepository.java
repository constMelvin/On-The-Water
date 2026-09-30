package com.gala.otw_server.notification.repository;

import com.gala.otw_server.notification.entity.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    Optional<Notification> findByIdAndUserId(UUID id, UUID userId);

    long countByUserIdAndReadAtIsNull(UUID userId);

    @Query("""
            SELECT n FROM Notification n
            WHERE n.userId = :userId
              AND (:cursorAt IS NULL
                   OR n.createdAt < :cursorAt
                   OR (n.createdAt = :cursorAt AND n.id < :cursorId))
            ORDER BY n.createdAt DESC, n.id DESC
            """)
    List<Notification> findPage(
            @Param("userId") UUID userId,
            @Param("cursorAt") OffsetDateTime cursorAt,
            @Param("cursorId") UUID cursorId,
            Pageable pageable);

    @Modifying
    @Query("UPDATE Notification n SET n.readAt = :now WHERE n.userId = :userId AND n.readAt IS NULL")
    int markAllRead(@Param("userId") UUID userId, @Param("now") OffsetDateTime now);
}

package com.gala.otw_server.chat.repository;

import com.gala.otw_server.chat.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    Optional<ChatMessage> findByIdAndRoomId(UUID id, UUID roomId);

    /** Newest first; the cursor is the oldest message the client already has. */
    @Query("""
            SELECT m FROM ChatMessage m
            WHERE m.roomId = :roomId
              AND (:cursorAt IS NULL
                   OR m.createdAt < :cursorAt
                   OR (m.createdAt = :cursorAt AND m.id < :cursorId))
            ORDER BY m.createdAt DESC, m.id DESC
            """)
    List<ChatMessage> findPage(
            @Param("roomId") UUID roomId,
            @Param("cursorAt") OffsetDateTime cursorAt,
            @Param("cursorId") UUID cursorId,
            Pageable pageable);

    /** Unread = newer than my marker and not written by me (system messages count). */
    @Query("""
            SELECT COUNT(m) FROM ChatMessage m
            WHERE m.roomId = :roomId
              AND (:since IS NULL OR m.createdAt > :since)
              AND (m.senderUserId IS NULL OR m.senderUserId <> :userId)
            """)
    long countUnread(@Param("roomId") UUID roomId,
                     @Param("userId") UUID userId,
                     @Param("since") OffsetDateTime since);

    @Query("""
            SELECT m FROM ChatMessage m
            WHERE m.roomId = :roomId
              AND (:since IS NULL OR m.createdAt > :since)
              AND (m.senderUserId IS NULL OR m.senderUserId <> :userId)
            ORDER BY m.createdAt ASC, m.id ASC
            """)
    List<ChatMessage> findFirstUnread(@Param("roomId") UUID roomId,
                                      @Param("userId") UUID userId,
                                      @Param("since") OffsetDateTime since,
                                      Pageable pageable);
}

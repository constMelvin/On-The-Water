package com.gala.otw_server.chat.repository;

import com.gala.otw_server.chat.entity.ChatReaction;
import com.gala.otw_server.chat.entity.ChatReactionId;
import com.gala.otw_server.chat.entity.ReactionType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface ChatReactionRepository extends JpaRepository<ChatReaction, ChatReactionId> {

    /** Rows of [messageId, reaction, count] for one page of messages. */
    @Query("""
            SELECT r.id.messageId, r.reaction, COUNT(r) FROM ChatReaction r
            WHERE r.id.messageId IN :messageIds
            GROUP BY r.id.messageId, r.reaction
            """)
    List<Object[]> countByMessageIds(@Param("messageIds") Collection<UUID> messageIds);

    /** Rows of [messageId, reaction] for the caller's own reactions on one page of messages. */
    @Query("""
            SELECT r.id.messageId, r.reaction FROM ChatReaction r
            WHERE r.id.messageId IN :messageIds AND r.id.userId = :userId
            """)
    List<Object[]> findMyReactions(@Param("messageIds") Collection<UUID> messageIds,
                                   @Param("userId") UUID userId);

    /**
     * Who reacted to one message, newest first; {@code reaction} null means every reaction.
     * The cursor is the last row the client has (its created_at and user id).
     */
    @Query("""
            SELECT r FROM ChatReaction r
            WHERE r.id.messageId = :messageId
              AND (:reaction IS NULL OR r.reaction = :reaction)
              AND (r.createdAt < :cursorAt
                   OR (r.createdAt = :cursorAt AND r.id.userId < :cursorUserId))
            ORDER BY r.createdAt DESC, r.id.userId DESC
            """)
    List<ChatReaction> findPage(@Param("messageId") UUID messageId,
                                @Param("reaction") ReactionType reaction,
                                @Param("cursorAt") OffsetDateTime cursorAt,
                                @Param("cursorUserId") UUID cursorUserId,
                                Pageable pageable);
}

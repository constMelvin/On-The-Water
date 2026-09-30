package com.gala.otw_server.chat.repository;

import com.gala.otw_server.chat.entity.ChatReaction;
import com.gala.otw_server.chat.entity.ChatReactionId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface ChatReactionRepository extends JpaRepository<ChatReaction, ChatReactionId> {

    /** Rows of [messageId, count] for one page of messages. */
    @Query("""
            SELECT r.id.messageId, COUNT(r) FROM ChatReaction r
            WHERE r.id.messageId IN :messageIds
            GROUP BY r.id.messageId
            """)
    List<Object[]> countByMessageIds(@Param("messageIds") Collection<UUID> messageIds);

    @Query("""
            SELECT r.id.messageId FROM ChatReaction r
            WHERE r.id.messageId IN :messageIds AND r.id.userId = :userId
            """)
    List<UUID> findReactedMessageIds(@Param("messageIds") Collection<UUID> messageIds,
                                     @Param("userId") UUID userId);

    long countByIdMessageId(UUID messageId);
}

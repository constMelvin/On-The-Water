package com.gala.otw_server.chat.repository;

import com.gala.otw_server.chat.entity.ChatMessageMention;
import com.gala.otw_server.chat.entity.ChatMessageMentionId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMessageMentionRepository extends JpaRepository<ChatMessageMention, ChatMessageMentionId> {

    /** The mentions on one page of messages. */
    List<ChatMessageMention> findByIdMessageIdIn(Collection<UUID> messageIds);
}

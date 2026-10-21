package com.gala.otw_server.chat.entity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** A member @mentioned in a chat message (insert-only, written with the message). */
@Entity
@Table(name = "chat_message_mentions")
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageMention {

    @EmbeddedId
    private ChatMessageMentionId id;
}

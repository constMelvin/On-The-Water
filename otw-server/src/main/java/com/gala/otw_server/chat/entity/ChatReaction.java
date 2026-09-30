package com.gala.otw_server.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/** A heart on a chat message — one per member per message. */
@Entity
@Table(name = "chat_reactions")
@Getter
@Setter
@NoArgsConstructor
public class ChatReaction {

    @EmbeddedId
    private ChatReactionId id;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public ChatReaction(ChatReactionId id) {
        this.id = id;
    }

    @PrePersist
    void onPrePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}

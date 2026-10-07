package com.gala.otw_server.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/** A reaction on a chat message — one per member per message (picking another replaces it). */
@Entity
@Table(name = "chat_reactions")
@Getter
@Setter
@NoArgsConstructor
public class ChatReaction {

    @EmbeddedId
    private ChatReactionId id;

    @Enumerated(EnumType.STRING)
    @Column(name = "reaction", nullable = false, length = 10)
    private ReactionType reaction = ReactionType.HEART;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public ChatReaction(ChatReactionId id, ReactionType reaction) {
        this.id = id;
        this.reaction = reaction;
    }

    @PrePersist
    void onPrePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}

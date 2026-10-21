package com.gala.otw_server.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One message in a gala's chat (Chismis). Insert-only: no edits, so no version column.
 */
@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@NoArgsConstructor
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "room_id", nullable = false, updatable = false)
    private UUID roomId;

    /** Null for SYSTEM messages. */
    @Column(name = "sender_user_id")
    private UUID senderUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 10, updatable = false)
    private MessageKind kind;

    @Column(name = "body", nullable = false, length = 1000, updatable = false)
    private String body;

    @Column(name = "ref_type", length = 30, updatable = false)
    private String refType;

    @Column(name = "ref_id", updatable = false)
    private UUID refId;

    /** The message this one replies to (same room, TEXT), or null. */
    @Column(name = "reply_to_message_id", updatable = false)
    private UUID replyToMessageId;

    /** True when the sender used @everyone (every active member was notified). */
    @Column(name = "mentions_everyone", nullable = false, updatable = false)
    private boolean mentionsEveryone;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onPrePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}

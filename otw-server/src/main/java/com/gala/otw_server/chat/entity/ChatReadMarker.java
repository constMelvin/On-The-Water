package com.gala.otw_server.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/** Where a member last read the chat — drives the unread badge and the "2 new" divider. */
@Entity
@Table(name = "chat_read_markers")
@Getter
@Setter
@NoArgsConstructor
public class ChatReadMarker {

    @EmbeddedId
    private ChatReadMarkerId id;

    @Column(name = "last_read_at", nullable = false)
    private OffsetDateTime lastReadAt;

    public ChatReadMarker(ChatReadMarkerId id, OffsetDateTime lastReadAt) {
        this.id = id;
        this.lastReadAt = lastReadAt;
    }
}

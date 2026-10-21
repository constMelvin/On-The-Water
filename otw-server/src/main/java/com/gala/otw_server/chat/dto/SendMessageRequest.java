package com.gala.otw_server.chat.dto;

import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Request body for {@code POST /rooms/{roomId}/chat/messages}.
 * <p>
 * {@code photoId} attaches a photo the caller already put in this gala's Gala Dump
 * ({@code POST /rooms/{roomId}/photos}); the body is then an optional caption. Without a photo
 * the body is required (checked in the service, since it depends on {@code photoId}).
 * <p>
 * {@code replyToMessageId} quotes an earlier TEXT message of this gala. {@code mentionedUserIds}
 * are active members to notify (at most 20 after dropping duplicates and the sender);
 * {@code mentionEveryone} notifies every active member. All three are optional.
 */
public record SendMessageRequest(
        @Size(max = 1000, message = "Message must be at most 1000 characters")
        String body,
        UUID photoId,
        UUID replyToMessageId,
        List<UUID> mentionedUserIds,
        Boolean mentionEveryone
) {
    public SendMessageRequest(String body) {
        this(body, null);
    }

    public SendMessageRequest(String body, UUID photoId) {
        this(body, photoId, null, null, null);
    }
}

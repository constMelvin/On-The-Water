package com.gala.otw_server.chat.dto;

import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Request body for {@code POST /rooms/{roomId}/chat/messages}.
 * <p>
 * {@code photoId} attaches a photo the caller already put in this gala's Gala Dump
 * ({@code POST /rooms/{roomId}/photos}); the body is then an optional caption. Without a photo
 * the body is required (checked in the service, since it depends on {@code photoId}).
 */
public record SendMessageRequest(
        @Size(max = 1000, message = "Message must be at most 1000 characters")
        String body,
        UUID photoId
) {
    public SendMessageRequest(String body) {
        this(body, null);
    }
}

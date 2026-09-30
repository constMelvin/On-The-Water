package com.gala.otw_server.chat.dto;

import com.gala.otw_server.chat.entity.ChatMessage;
import com.gala.otw_server.chat.entity.MessageKind;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Outbound chat message. The body is plain text — the frontend must escape it.
 */
public record ChatMessageDto(
        UUID id,
        UUID roomId,
        UUID senderUserId,
        MessageKind kind,
        String body,
        String refType,
        UUID refId,
        long heartCount,
        boolean reactedByMe,
        OffsetDateTime createdAt
) {
    public static ChatMessageDto from(ChatMessage m, long heartCount, boolean reactedByMe) {
        return new ChatMessageDto(
                m.getId(),
                m.getRoomId(),
                m.getSenderUserId(),
                m.getKind(),
                m.getBody(),
                m.getRefType(),
                m.getRefId(),
                heartCount,
                reactedByMe,
                m.getCreatedAt()
        );
    }
}

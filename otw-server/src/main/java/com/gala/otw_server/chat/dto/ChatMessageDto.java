package com.gala.otw_server.chat.dto;

import com.gala.otw_server.chat.entity.ChatMessage;
import com.gala.otw_server.chat.entity.MessageKind;
import com.gala.otw_server.chat.entity.ReactionType;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Outbound chat message. The body is plain text — the frontend must escape it.
 * <p>
 * {@code photo} is set for a message with {@code refType = "PHOTO"} whose Gala Dump photo still
 * exists; it is null for every other message and for a photo that was deleted from the Dump.
 * <p>
 * {@code reactions} counts each reaction on the message (only ones with at least one);
 * {@code myReaction} is the caller's own, or null. {@code heartCount} / {@code reactedByMe} are
 * the heart-only view kept for older clients.
 */
public record ChatMessageDto(
        UUID id,
        UUID roomId,
        UUID senderUserId,
        MessageKind kind,
        String body,
        String refType,
        UUID refId,
        ChatPhotoDto photo,
        Map<ReactionType, Long> reactions,
        ReactionType myReaction,
        long heartCount,
        boolean reactedByMe,
        OffsetDateTime createdAt
) {
    /** What the chat needs to show an attached photo: the Drive file to load and its type. */
    public record ChatPhotoDto(String driveFileId, String mimeType) {}

    /** A message nobody has reacted to yet (new messages, system lines, cards). */
    public static ChatMessageDto from(ChatMessage m) {
        return from(m, null, Map.of(), null);
    }

    public static ChatMessageDto from(ChatMessage m, ChatPhotoDto photo,
                                      Map<ReactionType, Long> reactions, ReactionType myReaction) {
        return new ChatMessageDto(
                m.getId(),
                m.getRoomId(),
                m.getSenderUserId(),
                m.getKind(),
                m.getBody(),
                m.getRefType(),
                m.getRefId(),
                photo,
                Map.copyOf(reactions),
                myReaction,
                reactions.getOrDefault(ReactionType.HEART, 0L),
                myReaction == ReactionType.HEART,
                m.getCreatedAt()
        );
    }
}

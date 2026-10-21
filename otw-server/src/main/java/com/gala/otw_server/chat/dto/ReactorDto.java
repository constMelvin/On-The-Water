package com.gala.otw_server.chat.dto;

import com.gala.otw_server.chat.entity.ChatReaction;
import com.gala.otw_server.chat.entity.ReactionType;

import java.time.OffsetDateTime;
import java.util.UUID;

/** One row of a message's "who reacted" list. The client maps userId to a member. */
public record ReactorDto(UUID userId, ReactionType reaction, OffsetDateTime reactedAt) {
    public static ReactorDto from(ChatReaction r) {
        return new ReactorDto(r.getId().getUserId(), r.getReaction(), r.getCreatedAt());
    }
}

package com.gala.otw_server.chat.dto;

import com.gala.otw_server.chat.entity.ReactionType;
import jakarta.validation.constraints.NotNull;

/** Request body for {@code PUT /rooms/{roomId}/chat/messages/{messageId}/reaction}. */
public record SetReactionRequest(
        @NotNull(message = "Pick a reaction")
        ReactionType reaction
) {}

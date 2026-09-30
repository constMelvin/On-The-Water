package com.gala.otw_server.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request body for {@code POST /rooms/{roomId}/chat/messages}. Quick replies send the same shape. */
public record SendMessageRequest(

        @NotBlank(message = "Message can't be empty")
        @Size(max = 1000, message = "Message must be at most 1000 characters")
        String body
) {}

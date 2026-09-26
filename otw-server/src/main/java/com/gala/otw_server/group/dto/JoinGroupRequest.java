package com.gala.otw_server.group.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /groups/join} — join an existing group by its code.
 */
public record JoinGroupRequest(

        @NotBlank(message = "Group code is required")
        @Size(min = 8, max = 8, message = "Group code must be exactly 8 characters")
        String groupCode,

        @NotBlank(message = "Nickname is required")
        @Size(max = 60, message = "Nickname must be at most 60 characters")
        String nickname
) {}

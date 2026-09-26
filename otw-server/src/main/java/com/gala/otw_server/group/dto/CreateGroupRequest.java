package com.gala.otw_server.group.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /groups} — create a new group.
 */
public record CreateGroupRequest(

        @NotBlank(message = "Group name is required")
        @Size(max = 120, message = "Group name must be at most 120 characters")
        String name,

        @NotBlank(message = "Nickname is required")
        @Size(max = 60, message = "Nickname must be at most 60 characters")
        String nickname
) {}

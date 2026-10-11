package com.gala.otw_server.award.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** Request body for {@code PUT /api/v1/rooms/{roomId}/awards/votes/{categoryKey}}. */
public record CastVoteRequest(@NotNull UUID nomineeUserId) {}

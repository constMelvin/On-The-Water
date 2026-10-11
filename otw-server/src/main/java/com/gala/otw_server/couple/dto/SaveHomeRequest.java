package com.gala.otw_server.couple.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Request body for {@code PUT /api/v1/rooms/{roomId}/couple/halfway/home}. */
public record SaveHomeRequest(
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
        @Size(max = 150, message = "Label must be at most 150 characters") String label
) {}

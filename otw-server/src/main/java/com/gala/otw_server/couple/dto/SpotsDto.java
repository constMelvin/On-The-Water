package com.gala.otw_server.couple.dto;

import java.util.List;

/** {@code available} is false when the place data source couldn't be reached (the screen says so; no error). */
public record SpotsDto(boolean available, List<SpotDto> spots) {}

package com.gala.otw_server.room.dto;

import java.util.UUID;

/** Published inside Plan a Gala's transaction; listeners run after it commits. */
public record GalaCreatedEvent(UUID roomId) {}

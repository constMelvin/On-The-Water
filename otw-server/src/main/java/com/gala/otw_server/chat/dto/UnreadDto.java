package com.gala.otw_server.chat.dto;

import java.util.UUID;

/** Unread badge count and where to draw the "new" divider (null when nothing is unread). */
public record UnreadDto(long count, UUID firstUnreadId) {}

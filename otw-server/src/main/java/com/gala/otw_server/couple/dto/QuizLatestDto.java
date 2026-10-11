package com.gala.otw_server.couple.dto;

/** The gala's most recent round, or {@code session = null} when none was played yet. */
public record QuizLatestDto(QuizSessionDto session) {}

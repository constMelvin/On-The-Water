package com.gala.otw_server.couple.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * QUIZ: {@code ownAnswer} (what's true for me) and {@code guessAnswer} (what I think my partner picked), both option keys.
 * DEEP_TALK: {@code textAnswer}. Answering a question again replaces my earlier answer until the round is revealed.
 */
public record QuizAnswerRequest(
        @NotBlank @Size(max = 40) String questionKey,
        @Size(max = 40) String ownAnswer,
        @Size(max = 40) String guessAnswer,
        @Size(max = 500) String textAnswer
) {}

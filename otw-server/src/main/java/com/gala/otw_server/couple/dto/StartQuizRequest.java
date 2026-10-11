package com.gala.otw_server.couple.dto;

import com.gala.otw_server.couple.entity.CoupleQuizMode;
import com.gala.otw_server.couple.entity.QuizCategory;
import jakarta.validation.constraints.NotNull;

/** {@code category} is optional and only for QUIZ (null = a mix of every category). */
public record StartQuizRequest(
        @NotNull CoupleQuizMode mode,
        QuizCategory category
) {}

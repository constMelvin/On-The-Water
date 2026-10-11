package com.gala.otw_server.couple.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * One person's answer to one question. QUIZ: {@code ownAnswer} + {@code guessAnswer} (option keys).
 * DEEP_TALK: {@code textAnswer}. The API never shows a partner's row until both have answered.
 */
@Entity
@Table(name = "couple_quiz_answers")
@Getter
@Setter
@NoArgsConstructor
public class CoupleQuizAnswer {

    @EmbeddedId
    private CoupleQuizAnswerId id;

    @Column(name = "own_answer", length = 40)
    private String ownAnswer;

    @Column(name = "guess_answer", length = 40)
    private String guessAnswer;

    @Column(name = "text_answer", length = 500)
    private String textAnswer;

    @Column(name = "answered_at", nullable = false)
    private OffsetDateTime answeredAt;

    public CoupleQuizAnswer(CoupleQuizAnswerId id) {
        this.id = id;
    }

    @PrePersist
    @PreUpdate
    void touch() {
        answeredAt = OffsetDateTime.now();
    }
}

package com.gala.otw_server.couple.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Getter
@NoArgsConstructor
@EqualsAndHashCode
public class CoupleQuizAnswerId implements Serializable {

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "question_key", nullable = false, length = 40)
    private String questionKey;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    public CoupleQuizAnswerId(UUID sessionId, String questionKey, UUID userId) {
        this.sessionId = sessionId;
        this.questionKey = questionKey;
        this.userId = userId;
    }
}

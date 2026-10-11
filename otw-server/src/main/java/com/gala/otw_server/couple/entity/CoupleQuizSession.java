package com.gala.otw_server.couple.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** One round of "Who Knows Who Better?" in a couple gala: the questions asked and in what order. */
@Entity
@Table(name = "couple_quiz_sessions")
@Getter
@Setter
@NoArgsConstructor
public class CoupleQuizSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "room_id", nullable = false, updatable = false)
    private UUID roomId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10, updatable = false)
    private CoupleQuizMode mode;

    /** Keys of the server-side question bank, in the order asked. */
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "question_keys", nullable = false, columnDefinition = "text[]", updatable = false)
    private List<String> questionKeys;

    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public CoupleQuizSession(UUID roomId, UUID createdBy, CoupleQuizMode mode, List<String> questionKeys) {
        this.roomId = roomId;
        this.createdBy = createdBy;
        this.mode = mode;
        this.questionKeys = questionKeys;
    }

    @PrePersist
    void onPrePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}

package com.gala.otw_server.award.entity;

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
public class AwardVoteId implements Serializable {

    @Column(name = "room_id", nullable = false)
    private UUID roomId;

    @Column(name = "category_key", nullable = false, length = 30)
    private String categoryKey;

    @Column(name = "voter_user_id", nullable = false)
    private UUID voterUserId;

    public AwardVoteId(UUID roomId, String categoryKey, UUID voterUserId) {
        this.roomId = roomId;
        this.categoryKey = categoryKey;
        this.voterUserId = voterUserId;
    }
}

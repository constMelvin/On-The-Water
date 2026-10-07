package com.gala.otw_server.profile.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/** One row per account user (Supabase auth user id); absent row = empty profile. */
@Entity
@Table(name = "user_profiles")
@Getter
@Setter
@NoArgsConstructor
public class UserProfile {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 20)
    private String nickname = "";

    @Column(nullable = false, length = 40)
    private String status = "";

    /** rosy | teal | zest | blossom, or null when the person never picked one. */
    @Column(length = 10)
    private String color;

    /** Browser-downscaled data URL (image/webp|jpeg|png), or null. */
    @Column(columnDefinition = "text")
    private String photo;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public UserProfile(UUID userId) {
        this.userId = userId;
    }

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }
}

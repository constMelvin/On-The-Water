package com.gala.otw_server.location.entity;

import com.gala.otw_server.location.dto.ShareMode;
import com.gala.otw_server.room.entity.Room;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * Ephemeral location sharing record for a member in a room.
 * Updated periodically during LIVE sharing or as a single PIN share.
 */
@Entity
@Table(name = "member_locations")
@Getter
@Setter
@NoArgsConstructor
public class MemberLocation {

    @EmbeddedId
    private MemberLocationId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("roomId")
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "lat", nullable = false)
    private double lat;

    @Column(name = "lng", nullable = false)
    private double lng;

    @Enumerated(EnumType.STRING)
    @Column(name = "share_mode", nullable = false, length = 10)
    private ShareMode shareMode;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void onPersistOrUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}

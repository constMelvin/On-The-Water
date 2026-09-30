package com.gala.otw_server.photo.entity;

import com.gala.otw_server.room.entity.Room;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Metadata record for a photo stored externally in Google Drive.
 * The backend never handles or stores binary files directly.
 */
@Entity
@Table(name = "photos")
@Getter
@Setter
@NoArgsConstructor
public class Photo {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "drive_file_id", nullable = false, length = 200)
    private String driveFileId;

    @Column(name = "uploaded_by", nullable = false, updatable = false)
    private UUID uploadedBy;

    @Column(name = "caption", length = 140)
    private String caption;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "READY"; // PENDING, READY, FAILED

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onPrePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (status == null) status = "READY";
    }
}

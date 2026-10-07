package com.gala.otw_server.photo.repository;

import com.gala.otw_server.photo.entity.Photo;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public interface PhotoRepository extends JpaRepository<Photo, UUID> {

    Optional<Photo> findByIdAndRoom_Id(UUID id, UUID roomId);

    /** This gala's photos among {@code ids} (chat loads the photos its messages point at). */
    List<Photo> findByRoom_IdAndIdIn(UUID roomId, Collection<UUID> ids);

    /** Which of these Drive file ids still have a photo row (used by the orphan sweep). */
    @Query("SELECT p.driveFileId FROM Photo p WHERE p.driveFileId IN :ids")
    Set<String> findExistingDriveFileIds(@Param("ids") Collection<String> ids);

    /** Newest first (the Dump shows new photos at the top); keyset on (createdAt, id). */
    @Query("""
            SELECT p FROM Photo p
            WHERE p.room.id = :roomId
              AND (:uploadedBy IS NULL OR p.uploadedBy = :uploadedBy)
              AND (p.createdAt < :cursorAt
                   OR (p.createdAt = :cursorAt AND p.id < :cursorId))
            ORDER BY p.createdAt DESC, p.id DESC
            """)
    List<Photo> findPhotos(
            @Param("roomId") UUID roomId,
            @Param("uploadedBy") UUID uploadedBy,
            @Param("cursorAt") OffsetDateTime cursorAt,
            @Param("cursorId") UUID cursorId,
            Pageable pageable);
}

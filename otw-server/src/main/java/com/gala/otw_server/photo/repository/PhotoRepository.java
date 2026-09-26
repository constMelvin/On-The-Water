package com.gala.otw_server.photo.repository;

import com.gala.otw_server.photo.entity.Photo;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PhotoRepository extends JpaRepository<Photo, UUID> {

    Optional<Photo> findByIdAndRoom_Id(UUID id, UUID roomId);

    @Query("""
            SELECT p FROM Photo p
            WHERE p.room.id = :roomId
              AND (:cursor IS NULL OR p.id > :cursor)
            ORDER BY p.createdAt DESC, p.id DESC
            """)
    List<Photo> findPhotos(
            @Param("roomId") UUID roomId,
            @Param("cursor") UUID cursor,
            Pageable pageable);
}

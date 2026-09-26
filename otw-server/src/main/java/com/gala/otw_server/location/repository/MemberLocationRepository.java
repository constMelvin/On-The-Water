package com.gala.otw_server.location.repository;

import com.gala.otw_server.location.entity.MemberLocation;
import com.gala.otw_server.location.entity.MemberLocationId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface MemberLocationRepository extends JpaRepository<MemberLocation, MemberLocationId> {

    List<MemberLocation> findById_RoomIdAndExpiresAtAfter(UUID roomId, OffsetDateTime now);

    void deleteById_RoomIdAndId_UserId(UUID roomId, UUID userId);

    @Modifying
    @Query("DELETE FROM MemberLocation ml WHERE ml.expiresAt < :now")
    int deleteExpiredLocations(@Param("now") OffsetDateTime now);
}

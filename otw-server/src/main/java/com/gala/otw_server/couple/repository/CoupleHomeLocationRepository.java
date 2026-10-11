package com.gala.otw_server.couple.repository;

import com.gala.otw_server.couple.entity.CoupleHomeLocation;
import com.gala.otw_server.couple.entity.CoupleHomeLocationId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CoupleHomeLocationRepository extends JpaRepository<CoupleHomeLocation, CoupleHomeLocationId> {

    /** A couple gala has two people, so at most two rows. */
    List<CoupleHomeLocation> findByIdRoomId(UUID roomId);
}

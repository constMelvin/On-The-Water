package com.gala.otw_server.couple.repository;

import com.gala.otw_server.couple.entity.CoupleSavedIdea;
import com.gala.otw_server.couple.entity.CoupleSavedIdeaId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CoupleSavedIdeaRepository extends JpaRepository<CoupleSavedIdea, CoupleSavedIdeaId> {

    /** Bounded by the catalog size. */
    List<CoupleSavedIdea> findByIdRoomId(UUID roomId);
}

package com.gala.otw_server.couple.repository;

import com.gala.otw_server.couple.entity.CoupleQuizSession;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CoupleQuizSessionRepository extends JpaRepository<CoupleQuizSession, UUID> {

    Optional<CoupleQuizSession> findByIdAndRoomId(UUID id, UUID roomId);

    /** Newest first; callers pass a small page (history / "questions already asked" for replay). */
    List<CoupleQuizSession> findByRoomIdOrderByCreatedAtDesc(UUID roomId, Pageable pageable);
}

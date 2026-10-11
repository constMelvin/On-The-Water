package com.gala.otw_server.couple.repository;

import com.gala.otw_server.couple.entity.CoupleQuizAnswer;
import com.gala.otw_server.couple.entity.CoupleQuizAnswerId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CoupleQuizAnswerRepository extends JpaRepository<CoupleQuizAnswer, CoupleQuizAnswerId> {

    /** Bounded: a session has at most (questions x 2 people) answers. */
    List<CoupleQuizAnswer> findByIdSessionId(UUID sessionId);
}

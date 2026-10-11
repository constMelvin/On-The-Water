package com.gala.otw_server.award.repository;

import com.gala.otw_server.award.entity.AwardPoll;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AwardPollRepository extends JpaRepository<AwardPoll, UUID> {}

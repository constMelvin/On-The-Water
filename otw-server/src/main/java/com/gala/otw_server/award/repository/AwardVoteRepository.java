package com.gala.otw_server.award.repository;

import com.gala.otw_server.award.entity.AwardVote;
import com.gala.otw_server.award.entity.AwardVoteId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AwardVoteRepository extends JpaRepository<AwardVote, AwardVoteId> {

    /** The caller's own votes only (at most one per category). */
    List<AwardVote> findByIdRoomIdAndIdVoterUserId(UUID roomId, UUID voterUserId);

    /** How many people have voted in at least one category (a count, never who). */
    @Query("SELECT COUNT(DISTINCT v.id.voterUserId) FROM AwardVote v WHERE v.id.roomId = :roomId")
    long countVoters(@Param("roomId") UUID roomId);

    /** Tallies for the results: rows of {categoryKey, nomineeUserId, votes}. No voter ids. */
    @Query("""
            SELECT v.id.categoryKey, v.nomineeUserId, COUNT(v)
            FROM AwardVote v
            WHERE v.id.roomId = :roomId
            GROUP BY v.id.categoryKey, v.nomineeUserId
            """)
    List<Object[]> tally(@Param("roomId") UUID roomId);
}

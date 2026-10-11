package com.gala.otw_server.award.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The Barkada Awards screen's whole state. Votes are anonymous: {@code myVotes} is only the caller's own picks,
 * {@code votedCount} is a number, and {@code results} (tallies per nominee, never per voter) only appears
 * once the poll is closed.
 */
public record AwardsDto(
        PollState state,
        /** The Gala Leader can open it right now. */
        boolean canOpen,
        /** Why it can't be opened yet (null when it can, or when it's already open / closed). */
        String unavailableReason,
        int minMembers,
        int eligibleVoters,
        long votedCount,
        OffsetDateTime openedAt,
        OffsetDateTime closesAt,
        OffsetDateTime closedAt,
        List<CategoryDto> categories,
        Map<String, UUID> myVotes,
        List<ResultDto> results
) {
    public enum PollState { NOT_OPEN, OPEN, CLOSED }

    public record CategoryDto(String key, String title, String blurb, List<HintDto> hints) {}

    /** A "nominees to consider" nudge: how many times this person did the thing (a count, never an amount). */
    public record HintDto(UUID userId, long count) {}

    /** {@code winners} is empty when nobody voted ("Walang bumoto"); several ids means co-winners on a tie. */
    public record ResultDto(String categoryKey, long totalVotes, List<UUID> winners, List<TallyDto> tally) {}

    public record TallyDto(UUID userId, long votes) {}
}

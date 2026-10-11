package com.gala.otw_server.award.service;

import com.gala.otw_server.award.dto.AwardsDto;
import com.gala.otw_server.award.dto.AwardsDto.*;
import com.gala.otw_server.award.entity.AwardCategory;
import com.gala.otw_server.award.entity.AwardPoll;
import com.gala.otw_server.award.entity.AwardVote;
import com.gala.otw_server.award.entity.AwardVoteId;
import com.gala.otw_server.award.repository.AwardHintQueries;
import com.gala.otw_server.award.repository.AwardPollRepository;
import com.gala.otw_server.award.repository.AwardVoteRepository;
import com.gala.otw_server.common.DomainExceptions.AwardsNotAvailableException;
import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;
import com.gala.otw_server.common.DomainExceptions.RoomNotFoundException;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.GalaPhase;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.room.service.GalaClock;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Barkada Awards poll. The Gala Leader opens it once the gala is over (done) and there are at least 3 people;
 * every member votes once per category (changing it until the poll closes), never for themselves.
 * Votes stay anonymous: nobody, the leader included, gets who voted for whom, and results are hidden until
 * the poll closes (the leader closes it early, or it auto-closes when its window ends, checked on read).
 * Ties give co-winners; a category nobody voted in has no winner.
 */
@Service
@Transactional
public class AwardService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AwardService.class);

    public static final int MIN_MEMBERS = 3;
    static final Set<Integer> ALLOWED_HOURS = Set.of(24, 48, 72);
    static final int MAX_HINTS = 3;

    private final AwardPollRepository pollRepo;
    private final AwardVoteRepository voteRepo;
    private final AwardHintQueries hintQueries;
    private final RoomRepository roomRepo;
    private final RoomMemberRepository memberRepo;
    private final GalaClock clock;
    private final RealtimeEventPublisher realtime;

    public AwardService(AwardPollRepository pollRepo,
                        AwardVoteRepository voteRepo,
                        AwardHintQueries hintQueries,
                        RoomRepository roomRepo,
                        RoomMemberRepository memberRepo,
                        GalaClock clock,
                        RealtimeEventPublisher realtime) {
        this.pollRepo = pollRepo;
        this.voteRepo = voteRepo;
        this.hintQueries = hintQueries;
        this.roomRepo = roomRepo;
        this.memberRepo = memberRepo;
        this.clock = clock;
        this.realtime = realtime;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AwardsDto get(UUID roomId, UUID callerId) {
        Room room = requireRoom(roomId);
        List<RoomMember> members = memberRepo.findByRoom_IdAndLeftAtIsNull(roomId);
        Optional<AwardPoll> poll = pollRepo.findById(roomId);
        OffsetDateTime now = clock.now();

        PollState state = poll.map(p -> p.isClosedAt(now) ? PollState.CLOSED : PollState.OPEN).orElse(PollState.NOT_OPEN);
        String reason = poll.isPresent() ? null : openBlocker(room, members.size());

        Map<String, UUID> mine = new LinkedHashMap<>();
        voteRepo.findByIdRoomIdAndIdVoterUserId(roomId, callerId)
                .forEach(v -> mine.put(v.getId().getCategoryKey(), v.getNomineeUserId()));

        Set<UUID> activeIds = members.stream().map(RoomMember::getUserId).collect(Collectors.toSet());
        List<CategoryDto> categories = Arrays.stream(AwardCategory.values())
                .map(c -> new CategoryDto(c.name(), c.title(), c.blurb(),
                        state == PollState.OPEN ? hints(c, roomId, activeIds) : List.of()))
                .toList();

        return new AwardsDto(
                state,
                poll.isEmpty() && reason == null,
                reason,
                MIN_MEMBERS,
                members.size(),
                poll.isPresent() ? voteRepo.countVoters(roomId) : 0,
                poll.map(AwardPoll::getOpenedAt).orElse(null),
                poll.map(AwardPoll::getClosesAt).orElse(null),
                poll.map(AwardPoll::getClosedAt).orElse(null),
                categories,
                mine,
                state == PollState.CLOSED ? results(roomId) : List.of());
    }

    // ── Open / close (Gala Leader; the controller enforces HOST) ──────────────

    public AwardsDto open(UUID roomId, UUID callerId, int hours) {
        if (!ALLOWED_HOURS.contains(hours)) {
            throw new InvalidRequestException("Voting can run for 24, 48 or 72 hours");
        }
        Room room = requireRoom(roomId);
        if (pollRepo.existsById(roomId)) {
            throw new AwardsNotAvailableException("Voting was already opened for this gala.");
        }
        String blocker = openBlocker(room, (int) memberRepo.countByRoom_IdAndLeftAtIsNull(roomId));
        if (blocker != null) throw new AwardsNotAvailableException(blocker);

        OffsetDateTime now = clock.now();
        pollRepo.save(new AwardPoll(roomId, callerId, now, now.plusHours(hours)));

        publishAfterCommit(roomId, "award.poll.changed", Map.of("state", PollState.OPEN.name()));
        return get(roomId, callerId);
    }

    public AwardsDto close(UUID roomId, UUID callerId) {
        AwardPoll poll = pollRepo.findById(roomId)
                .orElseThrow(() -> new AwardsNotAvailableException("Voting hasn't been opened yet."));
        OffsetDateTime now = clock.now();
        if (poll.isClosedAt(now)) {
            throw new AwardsNotAvailableException("Voting is already closed.");
        }
        poll.setClosedAt(now);
        pollRepo.save(poll);

        publishAfterCommit(roomId, "award.poll.changed", Map.of("state", PollState.CLOSED.name()));
        return get(roomId, callerId);
    }

    // ── Vote ──────────────────────────────────────────────────────────────────

    public AwardsDto vote(UUID roomId, UUID callerId, AwardCategory category, UUID nomineeId) {
        requireRoom(roomId);
        AwardPoll poll = pollRepo.findById(roomId)
                .orElseThrow(() -> new AwardsNotAvailableException("Voting hasn't been opened yet."));
        if (poll.isClosedAt(clock.now())) {
            throw new AwardsNotAvailableException("Voting is closed.");
        }
        if (nomineeId.equals(callerId)) {
            throw new InvalidRequestException("Pick someone else. No voting for yourself!");
        }
        if (!memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, nomineeId)) {
            throw new InvalidRequestException("That person isn't in this gala");
        }

        AwardVoteId id = new AwardVoteId(roomId, category.name(), callerId);
        AwardVote vote = voteRepo.findById(id).orElseGet(() -> new AwardVote(id, nomineeId));
        vote.setNomineeUserId(nomineeId);
        voteRepo.save(vote);

        // Only a headcount goes out: never who voted, or for whom.
        publishAfterCommit(roomId, "award.progress", Map.of("voted", voteRepo.countVoters(roomId)));
        return get(roomId, callerId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Why the poll can't be opened right now, or null when it can. */
    private String openBlocker(Room room, int activeMembers) {
        if (clock.phaseOf(room) != GalaPhase.DONE) return "Awards open after the gala ends.";
        if (activeMembers < MIN_MEMBERS) return "Awards need at least " + MIN_MEMBERS + " people.";
        return null;
    }

    private List<HintDto> hints(AwardCategory category, UUID roomId, Set<UUID> activeIds) {
        if (category.hint() == AwardCategory.Hint.NONE) return List.of();
        try {
            return hintQueries.counts(category.hint(), roomId).entrySet().stream()
                    .filter(e -> activeIds.contains(e.getKey()) && e.getValue() > 0)
                    .sorted(Map.Entry.<UUID, Long>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
                    .limit(MAX_HINTS)
                    .map(e -> new HintDto(e.getKey(), e.getValue()))
                    .toList();
        } catch (RuntimeException ex) {
            // Hints are a nicety: the ballot must work without them.
            log.warn("Award hints unavailable for {}: {}", category, ex.getMessage());
            return List.of();
        }
    }

    /** Winners per category from the tallies: the top vote count wins, a tie shares it, no votes = no winner. */
    List<ResultDto> results(UUID roomId) {
        Map<String, List<TallyDto>> byCategory = new HashMap<>();
        for (Object[] row : voteRepo.tally(roomId)) {
            byCategory.computeIfAbsent((String) row[0], k -> new ArrayList<>())
                    .add(new TallyDto((UUID) row[1], ((Number) row[2]).longValue()));
        }
        List<ResultDto> out = new ArrayList<>();
        for (AwardCategory c : AwardCategory.values()) {
            List<TallyDto> tally = new ArrayList<>(byCategory.getOrDefault(c.name(), List.of()));
            tally.sort(Comparator.comparingLong(TallyDto::votes).reversed().thenComparing(TallyDto::userId));
            long top = tally.isEmpty() ? 0 : tally.get(0).votes();
            List<UUID> winners = top == 0 ? List.of()
                    : tally.stream().filter(t -> t.votes() == top).map(TallyDto::userId).toList();
            out.add(new ResultDto(c.name(), tally.stream().mapToLong(TallyDto::votes).sum(), winners, tally));
        }
        return out;
    }

    private Room requireRoom(UUID roomId) {
        return roomRepo.findById(roomId).orElseThrow(RoomNotFoundException::new);
    }

    private void publishAfterCommit(UUID roomId, String event, Object payload) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    realtime.publish(roomId, event, payload);
                }
            });
        } else {
            realtime.publish(roomId, event, payload);
        }
    }
}

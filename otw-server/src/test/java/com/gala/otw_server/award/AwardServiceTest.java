package com.gala.otw_server.award;

import com.gala.otw_server.award.dto.AwardsDto;
import com.gala.otw_server.award.dto.AwardsDto.PollState;
import com.gala.otw_server.award.entity.AwardCategory;
import com.gala.otw_server.award.entity.AwardPoll;
import com.gala.otw_server.award.entity.AwardVote;
import com.gala.otw_server.award.entity.AwardVoteId;
import com.gala.otw_server.award.repository.AwardHintQueries;
import com.gala.otw_server.award.repository.AwardPollRepository;
import com.gala.otw_server.award.repository.AwardVoteRepository;
import com.gala.otw_server.award.service.AwardService;
import com.gala.otw_server.common.DomainExceptions.AwardsNotAvailableException;
import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.GalaPhase;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.room.service.GalaClock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AwardServiceTest {

    @Mock private AwardPollRepository pollRepo;
    @Mock private AwardVoteRepository voteRepo;
    @Mock private AwardHintQueries hintQueries;
    @Mock private RoomRepository roomRepo;
    @Mock private RoomMemberRepository memberRepo;
    @Mock private GalaClock clock;
    @Mock private RealtimeEventPublisher realtime;

    private AwardService service;
    private final UUID roomId = UUID.randomUUID();
    private final UUID leader = UUID.randomUUID();
    private final UUID ana = UUID.randomUUID();
    private final UUID ben = UUID.randomUUID();
    private final OffsetDateTime now = OffsetDateTime.parse("2026-10-30T10:00:00+08:00");
    private Room room;

    @BeforeEach
    void setUp() {
        service = new AwardService(pollRepo, voteRepo, hintQueries, roomRepo, memberRepo, clock, realtime);
        room = new Room();
        room.setId(roomId);
        lenient().when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        lenient().when(clock.now()).thenReturn(now);
        lenient().when(clock.phaseOf(room)).thenReturn(GalaPhase.DONE);
        lenient().when(memberRepo.findByRoom_IdAndLeftAtIsNull(roomId)).thenReturn(members(leader, ana, ben));
        lenient().when(memberRepo.countByRoom_IdAndLeftAtIsNull(roomId)).thenReturn(3L);
        lenient().when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(eq(roomId), any())).thenReturn(true);
    }

    private List<RoomMember> members(UUID... ids) {
        List<RoomMember> list = new ArrayList<>();
        for (UUID id : ids) {
            RoomMember m = new RoomMember();
            m.setUserId(id);
            list.add(m);
        }
        return list;
    }

    private AwardPoll openPoll() {
        return new AwardPoll(roomId, leader, now.minusHours(1), now.plusHours(47));
    }

    @Test
    @DisplayName("the leader can open the poll once the gala is done and there are 3 people; it runs for the chosen hours")
    void open() {
        when(pollRepo.findById(roomId)).thenReturn(Optional.empty());

        service.open(roomId, leader, 72);

        var saved = org.mockito.ArgumentCaptor.forClass(AwardPoll.class);
        verify(pollRepo).save(saved.capture());
        assertThat(saved.getValue().getOpenedBy()).isEqualTo(leader);
        assertThat(saved.getValue().getClosesAt()).isEqualTo(now.plusHours(72));
        verify(realtime).publish(eq(roomId), eq("award.poll.changed"), any());
    }

    @Test
    @DisplayName("can't open before the gala is done, with fewer than 3 people, twice, or with a odd window")
    void openBlocked() {
        when(clock.phaseOf(room)).thenReturn(GalaPhase.GALA_DAY);
        assertThatThrownBy(() -> service.open(roomId, leader, 48)).isInstanceOf(AwardsNotAvailableException.class);

        when(clock.phaseOf(room)).thenReturn(GalaPhase.DONE);
        when(memberRepo.countByRoom_IdAndLeftAtIsNull(roomId)).thenReturn(2L);
        assertThatThrownBy(() -> service.open(roomId, leader, 48)).isInstanceOf(AwardsNotAvailableException.class);

        lenient().when(memberRepo.countByRoom_IdAndLeftAtIsNull(roomId)).thenReturn(3L);
        when(pollRepo.existsById(roomId)).thenReturn(true);
        assertThatThrownBy(() -> service.open(roomId, leader, 48)).isInstanceOf(AwardsNotAvailableException.class);

        assertThatThrownBy(() -> service.open(roomId, leader, 5)).isInstanceOf(InvalidRequestException.class);
        verify(pollRepo, never()).save(any());
    }

    @Test
    @DisplayName("a vote is saved for another active member, and changing it replaces the row")
    void voteAndChange() {
        when(pollRepo.findById(roomId)).thenReturn(Optional.of(openPoll()));
        AwardVote existing = new AwardVote(new AwardVoteId(roomId, "TAGASALBA", ana), ben);
        when(voteRepo.findById(new AwardVoteId(roomId, "TAGASALBA", ana))).thenReturn(Optional.of(existing));

        service.vote(roomId, ana, AwardCategory.TAGASALBA, leader);

        assertThat(existing.getNomineeUserId()).isEqualTo(leader);
        verify(voteRepo).save(existing);
        // the realtime event only carries a headcount
        verify(realtime).publish(eq(roomId), eq("award.progress"), any());
    }

    @Test
    @DisplayName("no voting for yourself, for someone outside the gala, or after the poll closed")
    void voteBlocked() {
        when(pollRepo.findById(roomId)).thenReturn(Optional.of(openPoll()));
        assertThatThrownBy(() -> service.vote(roomId, ana, AwardCategory.LAGING_G, ana)).isInstanceOf(InvalidRequestException.class);

        UUID stranger = UUID.randomUUID();
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, stranger)).thenReturn(false);
        assertThatThrownBy(() -> service.vote(roomId, ana, AwardCategory.LAGING_G, stranger)).isInstanceOf(InvalidRequestException.class);

        AwardPoll closed = openPoll();
        closed.setClosedAt(now.minusMinutes(1));
        when(pollRepo.findById(roomId)).thenReturn(Optional.of(closed));
        assertThatThrownBy(() -> service.vote(roomId, ana, AwardCategory.LAGING_G, ben)).isInstanceOf(AwardsNotAvailableException.class);

        // the window ended on its own (no scheduler): closed on read
        AwardPoll expired = new AwardPoll(roomId, leader, now.minusHours(50), now.minusHours(2));
        when(pollRepo.findById(roomId)).thenReturn(Optional.of(expired));
        assertThatThrownBy(() -> service.vote(roomId, ana, AwardCategory.LAGING_G, ben)).isInstanceOf(AwardsNotAvailableException.class);
        verify(voteRepo, never()).save(any());
    }

    @Test
    @DisplayName("the leader can close early, once")
    void closeEarly() {
        AwardPoll poll = openPoll();
        when(pollRepo.findById(roomId)).thenReturn(Optional.of(poll));

        service.close(roomId, leader);

        assertThat(poll.getClosedAt()).isEqualTo(now);
        assertThatThrownBy(() -> service.close(roomId, leader)).isInstanceOf(AwardsNotAvailableException.class);
    }

    @Test
    @DisplayName("while open: no results, only my own votes, a voted headcount and hint counts for categories that have data")
    void openStateHidesResults() {
        when(pollRepo.findById(roomId)).thenReturn(Optional.of(openPoll()));
        when(voteRepo.findByIdRoomIdAndIdVoterUserId(roomId, ana))
                .thenReturn(List.of(new AwardVote(new AwardVoteId(roomId, "TAGASALBA", ana), ben)));
        when(voteRepo.countVoters(roomId)).thenReturn(2L);
        when(hintQueries.counts(any(), eq(roomId))).thenReturn(Map.of(leader, 5L, ben, 2L, UUID.randomUUID(), 9L));

        AwardsDto dto = service.get(roomId, ana);

        assertThat(dto.state()).isEqualTo(PollState.OPEN);
        assertThat(dto.results()).isEmpty();
        assertThat(dto.myVotes()).containsEntry("TAGASALBA", ben);
        assertThat(dto.votedCount()).isEqualTo(2);
        var tagasalba = dto.categories().stream().filter(c -> c.key().equals("TAGASALBA")).findFirst().orElseThrow();
        // a non-member (left the gala) isn't offered as a hint, and counts only, highest first
        assertThat(tagasalba.hints()).extracting(h -> h.userId()).containsExactly(leader, ben);
        // vote-only categories have no hints at all
        var lagingG = dto.categories().stream().filter(c -> c.key().equals("LAGING_G")).findFirst().orElseThrow();
        assertThat(lagingG.hints()).isEmpty();
        verify(hintQueries, never()).counts(eq(AwardCategory.Hint.NONE), any());
    }

    @Test
    @DisplayName("closed: winners per category, co-winners on a tie, no winner when nobody voted")
    void closedResults() {
        AwardPoll closed = openPoll();
        closed.setClosedAt(now);
        when(pollRepo.findById(roomId)).thenReturn(Optional.of(closed));
        when(voteRepo.tally(roomId)).thenReturn(List.of(
                new Object[]{"TAGASALBA", ana, 3L},
                new Object[]{"TAGASALBA", ben, 1L},
                new Object[]{"CHISMOSO", ana, 2L},
                new Object[]{"CHISMOSO", ben, 2L}));

        AwardsDto dto = service.get(roomId, leader);

        assertThat(dto.state()).isEqualTo(PollState.CLOSED);
        assertThat(dto.results()).hasSize(AwardCategory.values().length);
        var tagasalba = dto.results().stream().filter(r -> r.categoryKey().equals("TAGASALBA")).findFirst().orElseThrow();
        assertThat(tagasalba.winners()).containsExactly(ana);
        assertThat(tagasalba.totalVotes()).isEqualTo(4);
        var chismoso = dto.results().stream().filter(r -> r.categoryKey().equals("CHISMOSO")).findFirst().orElseThrow();
        assertThat(chismoso.winners()).containsExactlyInAnyOrder(ana, ben);
        var empty = dto.results().stream().filter(r -> r.categoryKey().equals("LITRATISTA")).findFirst().orElseThrow();
        assertThat(empty.winners()).isEmpty();
        assertThat(empty.totalVotes()).isZero();
        // closed polls offer no hints
        assertThat(dto.categories().stream().allMatch(c -> c.hints().isEmpty())).isTrue();
    }

    @Test
    @DisplayName("not open yet: the leader can open it only when the gala is done and there are 3 people")
    void notOpenState() {
        when(pollRepo.findById(roomId)).thenReturn(Optional.empty());
        assertThat(service.get(roomId, leader).canOpen()).isTrue();

        when(clock.phaseOf(room)).thenReturn(GalaPhase.PLANNING);
        AwardsDto early = service.get(roomId, leader);
        assertThat(early.canOpen()).isFalse();
        assertThat(early.unavailableReason()).contains("after the gala ends");
        assertThat(early.state()).isEqualTo(PollState.NOT_OPEN);

        when(clock.phaseOf(room)).thenReturn(GalaPhase.DONE);
        when(memberRepo.findByRoom_IdAndLeftAtIsNull(roomId)).thenReturn(members(leader, ana));
        assertThat(service.get(roomId, leader).unavailableReason()).contains("at least 3");
    }
}

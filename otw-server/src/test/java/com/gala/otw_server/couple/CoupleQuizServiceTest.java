package com.gala.otw_server.couple;

import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;
import com.gala.otw_server.common.DomainExceptions.NotACoupleRoomException;
import com.gala.otw_server.common.DomainExceptions.QuizSessionNotFoundException;
import com.gala.otw_server.couple.dto.QuizAnswerRequest;
import com.gala.otw_server.couple.dto.QuizSessionDto;
import com.gala.otw_server.couple.dto.StartQuizRequest;
import com.gala.otw_server.couple.entity.*;
import com.gala.otw_server.couple.repository.CoupleQuizAnswerRepository;
import com.gala.otw_server.couple.repository.CoupleQuizSessionRepository;
import com.gala.otw_server.couple.service.CoupleQuizBank;
import com.gala.otw_server.couple.service.CoupleQuizService;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.entity.RoomType;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CoupleQuizServiceTest {

    @Mock private CoupleQuizSessionRepository sessionRepo;
    @Mock private CoupleQuizAnswerRepository answerRepo;
    @Mock private RoomRepository roomRepo;
    @Mock private RoomMemberRepository memberRepo;
    @Mock private RealtimeEventPublisher realtime;

    private CoupleQuizService service;
    private final UUID roomId = UUID.randomUUID();
    private final UUID me = UUID.randomUUID();
    private final UUID partner = UUID.randomUUID();
    private Room couple;

    @BeforeEach
    void setUp() {
        service = new CoupleQuizService(sessionRepo, answerRepo, roomRepo, memberRepo, realtime);
        couple = new Room();
        couple.setId(roomId);
        couple.setRoomType(RoomType.COUPLE);
    }

    private CoupleQuizSession session(CoupleQuizMode mode, String... keys) {
        CoupleQuizSession s = new CoupleQuizSession(roomId, me, mode, List.of(keys));
        s.setId(UUID.randomUUID());
        return s;
    }

    private CoupleQuizAnswer quizAnswer(CoupleQuizSession s, String key, UUID user, String own, String guess) {
        CoupleQuizAnswer a = new CoupleQuizAnswer(new CoupleQuizAnswerId(s.getId(), key, user));
        a.setOwnAnswer(own);
        a.setGuessAnswer(guess);
        return a;
    }

    private void stubPartner() {
        RoomMember pm = new RoomMember();
        pm.setUserId(partner);
        when(memberRepo.findActiveMembers(eq(roomId), isNull(), any())).thenReturn(List.of(pm));
    }

    @Test
    @DisplayName("every bank question has unique options and Deep Talk has none")
    void bankIsSane() {
        for (var mode : CoupleQuizMode.values()) {
            for (var q : CoupleQuizBank.candidates(mode, null)) {
                if (mode == CoupleQuizMode.QUIZ) {
                    assertThat(q.options()).hasSizeGreaterThanOrEqualTo(3);
                    assertThat(q.options().stream().map(CoupleQuizBank.Option::key).distinct().count()).isEqualTo(q.options().size());
                } else {
                    assertThat(q.options()).isEmpty();
                }
                assertThat(q.key().length()).isLessThanOrEqualTo(40);
            }
        }
    }

    @Test
    @DisplayName("starting a quiz picks 6 different QUIZ questions and skips ones already asked")
    void startQuiz() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        CoupleQuizSession earlier = session(CoupleQuizMode.QUIZ, "FAV_DRINK", "FAV_TRIP");
        when(sessionRepo.findByRoomIdOrderByCreatedAtDesc(eq(roomId), any())).thenReturn(List.of(earlier));
        when(sessionRepo.save(any(CoupleQuizSession.class))).thenAnswer(inv -> {
            CoupleQuizSession s = inv.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });
        stubPartner();

        QuizSessionDto dto = service.start(roomId, me, new StartQuizRequest(CoupleQuizMode.QUIZ, null));

        assertThat(dto.total()).isEqualTo(6);
        assertThat(dto.questions().stream().map(QuizSessionDto.QuestionDto::key).distinct()).hasSize(6);
        assertThat(dto.questions().stream().map(QuizSessionDto.QuestionDto::key)).doesNotContain("FAV_DRINK", "FAV_TRIP");
        assertThat(dto.questions().stream().allMatch(q -> !q.options().isEmpty())).isTrue();
        assertThat(dto.revealed()).isFalse();
        verify(realtime).publish(eq(roomId), eq("couple.quiz.changed"), any());
    }

    @Test
    @DisplayName("starting Deep Talk picks 5 open questions")
    void startDeepTalk() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(sessionRepo.findByRoomIdOrderByCreatedAtDesc(eq(roomId), any())).thenReturn(List.of());
        when(sessionRepo.save(any(CoupleQuizSession.class))).thenAnswer(inv -> {
            CoupleQuizSession s = inv.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });
        stubPartner();

        QuizSessionDto dto = service.start(roomId, me, new StartQuizRequest(CoupleQuizMode.DEEP_TALK, null));

        assertThat(dto.total()).isEqualTo(5);
        assertThat(dto.questions().stream().allMatch(q -> q.options().isEmpty() && q.category().equals("DEEP_TALK"))).isTrue();
    }

    @Test
    @DisplayName("a group gala has no quiz")
    void groupRoom() {
        Room group = new Room();
        group.setId(roomId);
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(group));

        assertThatThrownBy(() -> service.start(roomId, me, new StartQuizRequest(CoupleQuizMode.QUIZ, null)))
                .isInstanceOf(NotACoupleRoomException.class);
    }

    @Test
    @DisplayName("a round from another gala is not found")
    void otherRoom() {
        UUID id = UUID.randomUUID();
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(sessionRepo.findByIdAndRoomId(id, roomId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(roomId, id, me)).isInstanceOf(QuizSessionNotFoundException.class);
    }

    @Test
    @DisplayName("an answer must use the question's own option keys")
    void rejectsBadOption() {
        CoupleQuizSession s = session(CoupleQuizMode.QUIZ, "FAV_DRINK");
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(sessionRepo.findByIdAndRoomId(s.getId(), roomId)).thenReturn(Optional.of(s));
        when(answerRepo.findByIdSessionId(s.getId())).thenReturn(List.of());

        assertThatThrownBy(() -> service.answer(roomId, s.getId(), me, new QuizAnswerRequest("FAV_DRINK", "COFFEE", "NOPE", null)))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> service.answer(roomId, s.getId(), me, new QuizAnswerRequest("FAV_TRIP", "BEACH", "CITY", null)))
                .isInstanceOf(InvalidRequestException.class);
        verify(answerRepo, never()).save(any());
    }

    @Test
    @DisplayName("before both finish, the partner's answers are never in the response")
    void partnerHiddenUntilBothDone() {
        CoupleQuizSession s = session(CoupleQuizMode.QUIZ, "FAV_DRINK", "FAV_TRIP");
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(sessionRepo.findByIdAndRoomId(s.getId(), roomId)).thenReturn(Optional.of(s));
        stubPartner();
        when(answerRepo.findByIdSessionId(s.getId())).thenReturn(List.of(
                quizAnswer(s, "FAV_DRINK", me, "COFFEE", "MILK_TEA"),
                quizAnswer(s, "FAV_TRIP", me, "BEACH", "CITY"),
                quizAnswer(s, "FAV_DRINK", partner, "MILK_TEA", "COFFEE")));

        QuizSessionDto dto = service.get(roomId, s.getId(), me);

        assertThat(dto.revealed()).isFalse();
        assertThat(dto.result()).isNull();
        assertThat(dto.myAnswered()).isEqualTo(2);
        assertThat(dto.partnerAnswered()).isEqualTo(1);
        assertThat(dto.myAnswers()).hasSize(2);
        assertThat(dto.partnerId()).isEqualTo(partner);
    }

    @Test
    @DisplayName("once both finish: each person's score is their right guesses, plus how many answers matched")
    void revealAndScore() {
        CoupleQuizSession s = session(CoupleQuizMode.QUIZ, "FAV_DRINK", "FAV_TRIP");
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(sessionRepo.findByIdAndRoomId(s.getId(), roomId)).thenReturn(Optional.of(s));
        stubPartner();
        // me: drink COFFEE (guessed MILK_TEA = right), trip BEACH (guessed CITY = wrong)
        // partner: drink MILK_TEA (guessed COFFEE = right), trip BEACH (guessed BEACH = right)
        when(answerRepo.findByIdSessionId(s.getId())).thenReturn(List.of(
                quizAnswer(s, "FAV_DRINK", me, "COFFEE", "MILK_TEA"),
                quizAnswer(s, "FAV_TRIP", me, "BEACH", "CITY"),
                quizAnswer(s, "FAV_DRINK", partner, "MILK_TEA", "COFFEE"),
                quizAnswer(s, "FAV_TRIP", partner, "BEACH", "BEACH")));

        QuizSessionDto dto = service.get(roomId, s.getId(), me);

        assertThat(dto.revealed()).isTrue();
        assertThat(dto.result().myScore()).isEqualTo(1);
        assertThat(dto.result().partnerScore()).isEqualTo(2);
        assertThat(dto.result().sameCount()).isEqualTo(1);
        assertThat(dto.result().items().get(0).same()).isFalse();
        assertThat(dto.result().items().get(1).same()).isTrue();
    }

    @Test
    @DisplayName("a finished round can't be changed")
    void lockedAfterReveal() {
        CoupleQuizSession s = session(CoupleQuizMode.QUIZ, "FAV_DRINK");
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(sessionRepo.findByIdAndRoomId(s.getId(), roomId)).thenReturn(Optional.of(s));
        when(answerRepo.findByIdSessionId(s.getId())).thenReturn(List.of(
                quizAnswer(s, "FAV_DRINK", me, "COFFEE", "COFFEE"),
                quizAnswer(s, "FAV_DRINK", partner, "COFFEE", "COFFEE")));

        assertThatThrownBy(() -> service.answer(roomId, s.getId(), me, new QuizAnswerRequest("FAV_DRINK", "SODA", "SODA", null)))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    @DisplayName("Deep Talk needs a written answer, is revealed together and is never scored")
    void deepTalk() {
        CoupleQuizSession s = session(CoupleQuizMode.DEEP_TALK, "DT_DREAM");
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(couple));
        when(sessionRepo.findByIdAndRoomId(s.getId(), roomId)).thenReturn(Optional.of(s));
        when(answerRepo.findByIdSessionId(s.getId())).thenReturn(List.of());

        assertThatThrownBy(() -> service.answer(roomId, s.getId(), me, new QuizAnswerRequest("DT_DREAM", null, null, "   ")))
                .isInstanceOf(InvalidRequestException.class);

        CoupleQuizAnswer mine = new CoupleQuizAnswer(new CoupleQuizAnswerId(s.getId(), "DT_DREAM", me));
        mine.setTextAnswer("Open a small cafe");
        CoupleQuizAnswer theirs = new CoupleQuizAnswer(new CoupleQuizAnswerId(s.getId(), "DT_DREAM", partner));
        theirs.setTextAnswer("Travel for a year");
        stubPartner();
        when(answerRepo.findByIdSessionId(s.getId())).thenReturn(List.of(mine, theirs));

        QuizSessionDto dto = service.get(roomId, s.getId(), me);

        assertThat(dto.revealed()).isTrue();
        assertThat(dto.result().myScore()).isNull();
        assertThat(dto.result().items().get(0).partnerText()).isEqualTo("Travel for a year");
    }
}

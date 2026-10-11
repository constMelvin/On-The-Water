package com.gala.otw_server.couple.service;

import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;
import com.gala.otw_server.common.DomainExceptions.NotACoupleRoomException;
import com.gala.otw_server.common.DomainExceptions.QuizSessionNotFoundException;
import com.gala.otw_server.common.DomainExceptions.RoomNotFoundException;
import com.gala.otw_server.couple.dto.QuizAnswerRequest;
import com.gala.otw_server.couple.dto.QuizLatestDto;
import com.gala.otw_server.couple.dto.QuizSessionDto;
import com.gala.otw_server.couple.dto.QuizSessionDto.*;
import com.gala.otw_server.couple.dto.StartQuizRequest;
import com.gala.otw_server.couple.entity.*;
import com.gala.otw_server.couple.repository.CoupleQuizAnswerRepository;
import com.gala.otw_server.couple.repository.CoupleQuizSessionRepository;
import com.gala.otw_server.couple.service.CoupleQuizBank.Question;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.security.SecureRandom;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Who Knows Who Better?: a round of questions both people answer privately, then reveal together.
 * QUIZ: for each question you pick what's true for you and guess what your partner picked (multiple
 * choice, exact match scoring). DEEP_TALK: open answers, revealed together, never scored.
 * The partner's answers are only ever sent once BOTH people have answered every question.
 */
@Service
@Transactional
public class CoupleQuizService {

    static final int QUIZ_SIZE = 6;
    static final int DEEP_SIZE = 5;
    /** How many earlier rounds to look at so a replay gets questions you haven't seen. */
    private static final int HISTORY = 20;
    private static final String EVENT = "couple.quiz.changed";

    private final CoupleQuizSessionRepository sessionRepo;
    private final CoupleQuizAnswerRepository answerRepo;
    private final RoomRepository roomRepo;
    private final RoomMemberRepository memberRepo;
    private final RealtimeEventPublisher realtime;
    private final Random random = new SecureRandom();

    public CoupleQuizService(CoupleQuizSessionRepository sessionRepo,
                             CoupleQuizAnswerRepository answerRepo,
                             RoomRepository roomRepo,
                             RoomMemberRepository memberRepo,
                             RealtimeEventPublisher realtime) {
        this.sessionRepo = sessionRepo;
        this.answerRepo = answerRepo;
        this.roomRepo = roomRepo;
        this.memberRepo = memberRepo;
        this.realtime = realtime;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public QuizLatestDto latest(UUID roomId, UUID callerId) {
        requireCoupleRoom(roomId);
        List<CoupleQuizSession> last = sessionRepo.findByRoomIdOrderByCreatedAtDesc(roomId, PageRequest.of(0, 1));
        return new QuizLatestDto(last.isEmpty() ? null : view(last.get(0), callerId));
    }

    @Transactional(readOnly = true)
    public QuizSessionDto get(UUID roomId, UUID sessionId, UUID callerId) {
        requireCoupleRoom(roomId);
        return view(requireSession(roomId, sessionId), callerId);
    }

    // ── Start (also "play again": every start is a new round) ─────────────────

    public QuizSessionDto start(UUID roomId, UUID callerId, StartQuizRequest req) {
        requireCoupleRoom(roomId);
        if (req.mode() == CoupleQuizMode.DEEP_TALK && req.category() != null && req.category() != QuizCategory.DEEP_TALK) {
            throw new InvalidRequestException("Deep Talk has its own questions");
        }
        if (req.mode() == CoupleQuizMode.QUIZ && req.category() == QuizCategory.DEEP_TALK) {
            throw new InvalidRequestException("Pick Deep Talk mode for those questions");
        }

        List<Question> pool = CoupleQuizBank.candidates(req.mode(), req.mode() == CoupleQuizMode.QUIZ ? req.category() : null);
        Set<String> seen = sessionRepo.findByRoomIdOrderByCreatedAtDesc(roomId, PageRequest.of(0, HISTORY)).stream()
                .flatMap(s -> s.getQuestionKeys().stream())
                .collect(Collectors.toSet());
        List<Question> fresh = new ArrayList<>(pool.stream().filter(q -> !seen.contains(q.key())).toList());
        int size = Math.min(req.mode() == CoupleQuizMode.QUIZ ? QUIZ_SIZE : DEEP_SIZE, pool.size());
        // Not enough unseen questions left: start over with the whole pool.
        List<Question> source = fresh.size() >= size ? fresh : new ArrayList<>(pool);
        Collections.shuffle(source, random);

        CoupleQuizSession session = sessionRepo.save(new CoupleQuizSession(
                roomId, callerId, req.mode(), source.stream().limit(size).map(Question::key).toList()));
        publishAfterCommit(roomId, session.getId());
        return view(session, callerId);
    }

    // ── Answer ────────────────────────────────────────────────────────────────

    public QuizSessionDto answer(UUID roomId, UUID sessionId, UUID callerId, QuizAnswerRequest req) {
        requireCoupleRoom(roomId);
        CoupleQuizSession session = requireSession(roomId, sessionId);
        if (!session.getQuestionKeys().contains(req.questionKey())) {
            throw new InvalidRequestException("That question isn't in this round");
        }
        Question q = CoupleQuizBank.byKey(req.questionKey());
        if (q == null) throw new InvalidRequestException("That question isn't in this round");

        List<CoupleQuizAnswer> all = answerRepo.findByIdSessionId(sessionId);
        if (isRevealed(session, all)) {
            throw new InvalidRequestException("This round is finished. Start a new one.");
        }

        CoupleQuizAnswer a = answerRepo.findById(new CoupleQuizAnswerId(sessionId, q.key(), callerId))
                .orElseGet(() -> new CoupleQuizAnswer(new CoupleQuizAnswerId(sessionId, q.key(), callerId)));
        if (session.getMode() == CoupleQuizMode.QUIZ) {
            if (!q.hasOption(req.ownAnswer()) || !q.hasOption(req.guessAnswer())) {
                throw new InvalidRequestException("Pick one of the options for both answers");
            }
            a.setOwnAnswer(req.ownAnswer());
            a.setGuessAnswer(req.guessAnswer());
            a.setTextAnswer(null);
        } else {
            String text = req.textAnswer() == null ? "" : req.textAnswer().trim();
            if (text.isEmpty()) throw new InvalidRequestException("Write your answer first");
            a.setTextAnswer(text);
            a.setOwnAnswer(null);
            a.setGuessAnswer(null);
        }
        answerRepo.save(a);

        publishAfterCommit(roomId, sessionId);
        return view(session, callerId);
    }

    // ── View (this is where the partner's answers stay hidden) ────────────────

    private QuizSessionDto view(CoupleQuizSession session, UUID callerId) {
        List<CoupleQuizAnswer> all = answerRepo.findByIdSessionId(session.getId());
        Map<String, CoupleQuizAnswer> mine = new HashMap<>();
        Map<String, CoupleQuizAnswer> theirs = new HashMap<>();
        UUID partnerId = findPartnerId(session.getRoomId(), callerId);
        for (CoupleQuizAnswer a : all) {
            if (a.getId().getUserId().equals(callerId)) mine.put(a.getId().getQuestionKey(), a);
            else {
                theirs.put(a.getId().getQuestionKey(), a);
                if (partnerId == null) partnerId = a.getId().getUserId();
            }
        }

        int total = session.getQuestionKeys().size();
        boolean revealed = total > 0 && mine.size() == total && theirs.size() == total;

        List<QuestionDto> questions = session.getQuestionKeys().stream()
                .map(CoupleQuizBank::byKey)
                .filter(Objects::nonNull)
                .map(q -> new QuestionDto(q.key(), q.category().name(), q.text(),
                        q.options().stream().map(o -> new OptionDto(o.key(), o.label())).toList()))
                .toList();
        List<MyAnswerDto> myAnswers = session.getQuestionKeys().stream()
                .filter(mine::containsKey)
                .map(k -> {
                    CoupleQuizAnswer a = mine.get(k);
                    return new MyAnswerDto(k, a.getOwnAnswer(), a.getGuessAnswer(), a.getTextAnswer());
                })
                .toList();

        ResultDto result = revealed ? result(session, mine, theirs) : null;
        return new QuizSessionDto(session.getId(), session.getMode(), session.getCreatedAt(), questions, myAnswers,
                mine.size(), theirs.size(), total, revealed, partnerId, result);
    }

    private static ResultDto result(CoupleQuizSession session, Map<String, CoupleQuizAnswer> mine, Map<String, CoupleQuizAnswer> theirs) {
        boolean quiz = session.getMode() == CoupleQuizMode.QUIZ;
        int myScore = 0;
        int partnerScore = 0;
        int same = 0;
        List<ItemDto> items = new ArrayList<>();
        for (String key : session.getQuestionKeys()) {
            CoupleQuizAnswer m = mine.get(key);
            CoupleQuizAnswer t = theirs.get(key);
            boolean myCorrect = quiz && Objects.equals(m.getGuessAnswer(), t.getOwnAnswer());
            boolean partnerCorrect = quiz && Objects.equals(t.getGuessAnswer(), m.getOwnAnswer());
            boolean sameAnswer = quiz && Objects.equals(m.getOwnAnswer(), t.getOwnAnswer());
            if (myCorrect) myScore++;
            if (partnerCorrect) partnerScore++;
            if (sameAnswer) same++;
            items.add(new ItemDto(key, m.getOwnAnswer(), t.getOwnAnswer(), m.getGuessAnswer(), t.getGuessAnswer(),
                    myCorrect, partnerCorrect, sameAnswer, m.getTextAnswer(), t.getTextAnswer()));
        }
        int total = session.getQuestionKeys().size();
        return new ResultDto(quiz ? myScore : null, quiz ? partnerScore : null, total, same, items);
    }

    private static boolean isRevealed(CoupleQuizSession session, List<CoupleQuizAnswer> all) {
        int total = session.getQuestionKeys().size();
        Map<UUID, Long> perUser = all.stream().collect(Collectors.groupingBy(a -> a.getId().getUserId(), Collectors.counting()));
        return total > 0 && perUser.size() >= 2 && perUser.values().stream().allMatch(c -> c >= total);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private UUID findPartnerId(UUID roomId, UUID callerId) {
        return memberRepo.findActiveMembers(roomId, null, PageRequest.of(0, 5)).stream()
                .map(RoomMember::getUserId)
                .filter(id -> !id.equals(callerId))
                .findFirst()
                .orElse(null);
    }

    private CoupleQuizSession requireSession(UUID roomId, UUID sessionId) {
        return sessionRepo.findByIdAndRoomId(sessionId, roomId).orElseThrow(QuizSessionNotFoundException::new);
    }

    private void requireCoupleRoom(UUID roomId) {
        Room room = roomRepo.findById(roomId).orElseThrow(RoomNotFoundException::new);
        if (!room.isCouple()) throw new NotACoupleRoomException();
    }

    /** The event carries only the round's id: answers are never broadcast. */
    private void publishAfterCommit(UUID roomId, UUID sessionId) {
        Map<String, Object> payload = Map.of("sessionId", sessionId);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    realtime.publish(roomId, EVENT, payload);
                }
            });
        } else {
            realtime.publish(roomId, EVENT, payload);
        }
    }
}

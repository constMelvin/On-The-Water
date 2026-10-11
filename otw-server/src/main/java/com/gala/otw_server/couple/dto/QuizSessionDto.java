package com.gala.otw_server.couple.dto;

import com.gala.otw_server.couple.entity.CoupleQuizMode;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * One round of "Who Knows Who Better?" as the caller sees it. Before both people have answered every question
 * the partner's answers are NOT here, only how many they have answered: {@code result} is null until
 * {@code revealed}. (The server hides them; the screen is not trusted to.)
 */
public record QuizSessionDto(
        UUID id,
        CoupleQuizMode mode,
        OffsetDateTime createdAt,
        List<QuestionDto> questions,
        List<MyAnswerDto> myAnswers,
        int myAnswered,
        int partnerAnswered,
        int total,
        boolean revealed,
        UUID partnerId,
        ResultDto result
) {
    public record OptionDto(String key, String label) {}

    public record QuestionDto(String key, String category, String text, List<OptionDto> options) {}

    public record MyAnswerDto(String questionKey, String ownAnswer, String guessAnswer, String textAnswer) {}

    /** QUIZ: {@code myScore} = my right guesses of my partner's answers, {@code partnerScore} the other way round. DEEP_TALK: no scores. */
    public record ResultDto(Integer myScore, Integer partnerScore, int total, int sameCount, List<ItemDto> items) {}

    public record ItemDto(
            String questionKey,
            String myOwn,
            String partnerOwn,
            String myGuess,
            String partnerGuess,
            boolean myCorrect,
            boolean partnerCorrect,
            boolean same,
            String myText,
            String partnerText
    ) {}
}

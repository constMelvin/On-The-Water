package com.gala.otw_server.couple.controller;

import com.gala.otw_server.couple.dto.QuizAnswerRequest;
import com.gala.otw_server.couple.dto.QuizLatestDto;
import com.gala.otw_server.couple.dto.QuizSessionDto;
import com.gala.otw_server.couple.dto.StartQuizRequest;
import com.gala.otw_server.couple.service.CoupleQuizService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomRole;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Who Knows Who Better?: start a round, answer privately, reveal together. */
@RestController
@RequestMapping("/api/v1/rooms/{roomId}/couple/quiz")
public class CoupleQuizController {

    private final CoupleQuizService quizService;
    private final CurrentUserProvider currentUser;

    public CoupleQuizController(CoupleQuizService quizService, CurrentUserProvider currentUser) {
        this.quizService = quizService;
        this.currentUser = currentUser;
    }

    @GetMapping("/latest")
    @RequireRoomRole(RoomRole.MEMBER)
    public QuizLatestDto latest(@PathVariable UUID roomId) {
        return quizService.latest(roomId, currentUser.getUserId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequireRoomRole(RoomRole.MEMBER)
    public QuizSessionDto start(@PathVariable UUID roomId, @Valid @RequestBody StartQuizRequest req) {
        return quizService.start(roomId, currentUser.getUserId(), req);
    }

    @GetMapping("/{sessionId}")
    @RequireRoomRole(RoomRole.MEMBER)
    public QuizSessionDto get(@PathVariable UUID roomId, @PathVariable UUID sessionId) {
        return quizService.get(roomId, sessionId, currentUser.getUserId());
    }

    @PutMapping("/{sessionId}/answers")
    @RequireRoomRole(RoomRole.MEMBER)
    public QuizSessionDto answer(
            @PathVariable UUID roomId,
            @PathVariable UUID sessionId,
            @Valid @RequestBody QuizAnswerRequest req) {
        return quizService.answer(roomId, sessionId, currentUser.getUserId(), req);
    }
}

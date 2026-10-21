package com.gala.otw_server.chat.controller;

import com.gala.otw_server.chat.dto.ChatMessageDto;
import com.gala.otw_server.chat.dto.ReactorDto;
import com.gala.otw_server.chat.dto.SendMessageRequest;
import com.gala.otw_server.chat.dto.SetReactionRequest;
import com.gala.otw_server.chat.dto.UnreadDto;
import com.gala.otw_server.chat.entity.ReactionType;
import com.gala.otw_server.chat.service.ChatService;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomRole;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rooms/{roomId}/chat")
public class ChatController {

    private final ChatService chatService;
    private final CurrentUserProvider currentUser;

    public ChatController(ChatService chatService, CurrentUserProvider currentUser) {
        this.chatService = chatService;
        this.currentUser = currentUser;
    }

    // ── GET /rooms/{roomId}/chat/messages — newest first, cursor = oldest id held ──

    @GetMapping("/messages")
    @RequireRoomRole(RoomRole.MEMBER)
    public PageResponse<ChatMessageDto> getMessages(
            @PathVariable UUID roomId,
            @RequestParam(required = false) UUID cursor,
            @RequestParam(defaultValue = "30") int limit) {
        return chatService.getMessages(roomId, currentUser.getUserId(), cursor, Math.max(1, Math.min(limit, 50)));
    }

    // ── POST /rooms/{roomId}/chat/messages — send ─────────────────────────────

    @PostMapping("/messages")
    @ResponseStatus(HttpStatus.CREATED)
    @RequireRoomRole(RoomRole.MEMBER)
    public ChatMessageDto send(
            @PathVariable UUID roomId,
            @Valid @RequestBody SendMessageRequest req) {
        return chatService.send(roomId, currentUser.getUserId(), req);
    }

    // ── PUT / DELETE /rooms/{roomId}/chat/messages/{messageId}/reaction ───────

    @PutMapping("/messages/{messageId}/reaction")
    @RequireRoomRole(RoomRole.MEMBER)
    public ChatMessageDto react(
            @PathVariable UUID roomId,
            @PathVariable UUID messageId,
            @Valid @RequestBody SetReactionRequest req) {
        return chatService.setReaction(roomId, messageId, currentUser.getUserId(), req.reaction());
    }

    @DeleteMapping("/messages/{messageId}/reaction")
    @RequireRoomRole(RoomRole.MEMBER)
    public ChatMessageDto unreact(@PathVariable UUID roomId, @PathVariable UUID messageId) {
        return chatService.setReaction(roomId, messageId, currentUser.getUserId(), null);
    }

    // ── GET /rooms/{roomId}/chat/messages/{messageId}/reactions — who reacted ─

    @GetMapping("/messages/{messageId}/reactions")
    @RequireRoomRole(RoomRole.MEMBER)
    public PageResponse<ReactorDto> getReactors(
            @PathVariable UUID roomId,
            @PathVariable UUID messageId,
            @RequestParam(required = false) ReactionType reaction,
            @RequestParam(required = false) UUID cursor,
            @RequestParam(defaultValue = "50") int limit) {
        return chatService.getReactors(roomId, messageId, reaction, cursor, Math.max(1, Math.min(limit, 100)));
    }

    // ── PUT / DELETE /rooms/{roomId}/chat/messages/{messageId}/heart (kept for older clients) ──────────

    @PutMapping("/messages/{messageId}/heart")
    @RequireRoomRole(RoomRole.MEMBER)
    public ChatMessageDto heart(@PathVariable UUID roomId, @PathVariable UUID messageId) {
        return chatService.setHeart(roomId, messageId, currentUser.getUserId(), true);
    }

    @DeleteMapping("/messages/{messageId}/heart")
    @RequireRoomRole(RoomRole.MEMBER)
    public ChatMessageDto unheart(@PathVariable UUID roomId, @PathVariable UUID messageId) {
        return chatService.setHeart(roomId, messageId, currentUser.getUserId(), false);
    }

    // ── PUT /rooms/{roomId}/chat/read — mark everything read ──────────────────

    @PutMapping("/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RequireRoomRole(value = RoomRole.MEMBER, allowArchived = true)
    public void markRead(@PathVariable UUID roomId) {
        chatService.markRead(roomId, currentUser.getUserId());
    }

    // ── GET /rooms/{roomId}/chat/unread ───────────────────────────────────────

    @GetMapping("/unread")
    @RequireRoomRole(RoomRole.MEMBER)
    public UnreadDto getUnread(@PathVariable UUID roomId) {
        return chatService.getUnread(roomId, currentUser.getUserId());
    }
}

package com.gala.otw_server.chat.service;

import com.gala.otw_server.chat.dto.ChatMessageDto;
import com.gala.otw_server.chat.dto.SendMessageRequest;
import com.gala.otw_server.chat.dto.UnreadDto;
import com.gala.otw_server.chat.entity.*;
import com.gala.otw_server.chat.repository.ChatMessageRepository;
import com.gala.otw_server.chat.repository.ChatReactionRepository;
import com.gala.otw_server.chat.repository.ChatReadMarkerRepository;
import com.gala.otw_server.common.DomainExceptions.ChatMessageNotFoundException;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.ratelimit.RateLimiterService;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
@Transactional
public class ChatService {

    /** Spam guard on top of the global write limit: 20 messages per minute per member. */
    private static final int MAX_MESSAGES_PER_MINUTE = 20;

    private final ChatMessageRepository messageRepo;
    private final ChatReactionRepository reactionRepo;
    private final ChatReadMarkerRepository markerRepo;
    private final RateLimiterService rateLimiter;
    private final RealtimeEventPublisher realtime;

    public ChatService(ChatMessageRepository messageRepo,
                       ChatReactionRepository reactionRepo,
                       ChatReadMarkerRepository markerRepo,
                       RateLimiterService rateLimiter,
                       RealtimeEventPublisher realtime) {
        this.messageRepo = messageRepo;
        this.reactionRepo = reactionRepo;
        this.markerRepo = markerRepo;
        this.rateLimiter = rateLimiter;
        this.realtime = realtime;
    }

    // ── List messages (newest first) ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<ChatMessageDto> getMessages(UUID roomId, UUID callerId, UUID cursor, int limit) {
        OffsetDateTime cursorAt = com.gala.otw_server.common.CursorBounds.NEWEST;
        UUID cursorId = null;
        if (cursor != null) {
            ChatMessage c = messageRepo.findByIdAndRoomId(cursor, roomId).orElse(null);
            if (c != null) {
                cursorAt = c.getCreatedAt();
                cursorId = c.getId();
            }
        }

        List<ChatMessage> rows = messageRepo.findPage(roomId, cursorAt, cursorId, PageRequest.of(0, limit + 1));
        boolean hasMore = rows.size() > limit;
        List<ChatMessage> page = rows.stream().limit(limit).toList();

        List<UUID> ids = page.stream().map(ChatMessage::getId).toList();
        Map<UUID, Long> hearts = new HashMap<>();
        Set<UUID> mine = new HashSet<>();
        if (!ids.isEmpty()) {
            for (Object[] row : reactionRepo.countByMessageIds(ids)) {
                hearts.put((UUID) row[0], (Long) row[1]);
            }
            mine.addAll(reactionRepo.findReactedMessageIds(ids, callerId));
        }

        List<ChatMessageDto> dtos = page.stream()
                .map(m -> ChatMessageDto.from(m, hearts.getOrDefault(m.getId(), 0L), mine.contains(m.getId())))
                .toList();

        String nextCursor = (hasMore && !page.isEmpty()) ? page.get(page.size() - 1).getId().toString() : null;
        return PageResponse.of(dtos, nextCursor, limit);
    }

    // ── Send ──────────────────────────────────────────────────────────────────

    public ChatMessageDto send(UUID roomId, UUID callerId, SendMessageRequest req) {
        rateLimiter.checkRateLimit("ratelimit:chat:" + callerId, MAX_MESSAGES_PER_MINUTE, Duration.ofMinutes(1));

        ChatMessage m = new ChatMessage();
        m.setRoomId(roomId);
        m.setSenderUserId(callerId);
        m.setKind(MessageKind.TEXT);
        m.setBody(req.body().strip());
        ChatMessage saved = messageRepo.save(m);

        // Sending implies I've read everything up to my own message.
        upsertMarker(roomId, callerId, saved.getCreatedAt());

        ChatMessageDto dto = ChatMessageDto.from(saved, 0, false);
        publishAfterCommit(roomId, "chat.message.created", dto);
        return dto;
    }

    // ── Heart reaction (idempotent on/off) ────────────────────────────────────

    public ChatMessageDto setHeart(UUID roomId, UUID messageId, UUID callerId, boolean on) {
        ChatMessage m = messageRepo.findByIdAndRoomId(messageId, roomId)
                .orElseThrow(ChatMessageNotFoundException::new);

        ChatReactionId id = new ChatReactionId(messageId, callerId);
        boolean exists = reactionRepo.existsById(id);
        if (on && !exists) {
            reactionRepo.save(new ChatReaction(id));
        } else if (!on && exists) {
            reactionRepo.deleteById(id);
        }
        reactionRepo.flush();

        long count = reactionRepo.countByIdMessageId(messageId);
        ChatMessageDto dto = ChatMessageDto.from(m, count, on);
        publishAfterCommit(roomId, "chat.reaction.changed",
                Map.of("messageId", messageId, "userId", callerId, "hearted", on, "heartCount", count));
        return dto;
    }

    // ── Read state ────────────────────────────────────────────────────────────

    public void markRead(UUID roomId, UUID callerId) {
        upsertMarker(roomId, callerId, OffsetDateTime.now());
    }

    @Transactional(readOnly = true)
    public UnreadDto getUnread(UUID roomId, UUID callerId) {
        OffsetDateTime since = lastReadAt(roomId, callerId);
        long count = messageRepo.countUnread(roomId, callerId, since);
        UUID first = count == 0 ? null
                : messageRepo.findFirstUnread(roomId, callerId, since, PageRequest.of(0, 1))
                        .stream().findFirst().map(ChatMessage::getId).orElse(null);
        return new UnreadDto(count, first);
    }

    @Transactional(readOnly = true)
    public long countUnread(UUID roomId, UUID callerId) {
        return messageRepo.countUnread(roomId, callerId, lastReadAt(roomId, callerId));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private OffsetDateTime lastReadAt(UUID roomId, UUID userId) {
        return markerRepo.findById(new ChatReadMarkerId(roomId, userId))
                .map(ChatReadMarker::getLastReadAt)
                // Never null: the unread queries compare "createdAt > :since", and no marker
                // means everything is unread.
                .orElse(OffsetDateTime.ofInstant(Instant.EPOCH, ZoneOffset.UTC));
    }

    private void upsertMarker(UUID roomId, UUID userId, OffsetDateTime at) {
        ChatReadMarkerId id = new ChatReadMarkerId(roomId, userId);
        ChatReadMarker marker = markerRepo.findById(id).orElseGet(() -> new ChatReadMarker(id, at));
        if (marker.getLastReadAt().isBefore(at)) {
            marker.setLastReadAt(at);
        }
        markerRepo.save(marker);
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

package com.gala.otw_server.chat.service;

import com.gala.otw_server.chat.dto.ChatMessageDto;
import com.gala.otw_server.chat.dto.ChatMessageDto.ChatPhotoDto;
import com.gala.otw_server.chat.dto.SendMessageRequest;
import com.gala.otw_server.chat.dto.UnreadDto;
import com.gala.otw_server.chat.entity.*;
import com.gala.otw_server.chat.repository.ChatMessageRepository;
import com.gala.otw_server.chat.repository.ChatReactionRepository;
import com.gala.otw_server.chat.repository.ChatReadMarkerRepository;
import com.gala.otw_server.common.DomainExceptions.ChatMessageNotFoundException;
import com.gala.otw_server.common.DomainExceptions.InvalidPhotoReferenceException;
import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.photo.entity.Photo;
import com.gala.otw_server.photo.repository.PhotoRepository;
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

    /** {@code ref_type} of a message that carries a Gala Dump photo. */
    public static final String REF_PHOTO = "PHOTO";

    private final ChatMessageRepository messageRepo;
    private final ChatReactionRepository reactionRepo;
    private final ChatReadMarkerRepository markerRepo;
    private final RateLimiterService rateLimiter;
    private final RealtimeEventPublisher realtime;
    private final PhotoRepository photoRepo;

    public ChatService(ChatMessageRepository messageRepo,
                       ChatReactionRepository reactionRepo,
                       ChatReadMarkerRepository markerRepo,
                       RateLimiterService rateLimiter,
                       RealtimeEventPublisher realtime,
                       PhotoRepository photoRepo) {
        this.messageRepo = messageRepo;
        this.reactionRepo = reactionRepo;
        this.markerRepo = markerRepo;
        this.rateLimiter = rateLimiter;
        this.realtime = realtime;
        this.photoRepo = photoRepo;
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
        Map<UUID, Map<ReactionType, Long>> counts = new HashMap<>();
        Map<UUID, ReactionType> mine = new HashMap<>();
        if (!ids.isEmpty()) {
            for (Object[] row : reactionRepo.countByMessageIds(ids)) {
                counts.computeIfAbsent((UUID) row[0], k -> new EnumMap<>(ReactionType.class))
                        .put((ReactionType) row[1], (Long) row[2]);
            }
            for (Object[] row : reactionRepo.findMyReactions(ids, callerId)) {
                mine.put((UUID) row[0], (ReactionType) row[1]);
            }
        }

        Map<UUID, ChatPhotoDto> photos = photosFor(roomId, page);
        List<ChatMessageDto> dtos = page.stream()
                .map(m -> ChatMessageDto.from(m, photoOf(m, photos),
                        counts.getOrDefault(m.getId(), Map.of()), mine.get(m.getId())))
                .toList();

        String nextCursor = (hasMore && !page.isEmpty()) ? page.get(page.size() - 1).getId().toString() : null;
        return PageResponse.of(dtos, nextCursor, limit);
    }

    // ── Send ──────────────────────────────────────────────────────────────────

    public ChatMessageDto send(UUID roomId, UUID callerId, SendMessageRequest req) {
        rateLimiter.checkRateLimit("ratelimit:chat:" + callerId, MAX_MESSAGES_PER_MINUTE, Duration.ofMinutes(1));

        String body = req.body() == null ? "" : req.body().strip();
        ChatPhotoDto photo = null;
        if (req.photoId() != null) {
            photo = requireOwnPhoto(roomId, callerId, req.photoId());
        } else if (body.isEmpty()) {
            throw new InvalidRequestException("Message can't be empty");
        }

        ChatMessage m = new ChatMessage();
        m.setRoomId(roomId);
        m.setSenderUserId(callerId);
        m.setKind(MessageKind.TEXT);
        m.setBody(body);
        if (photo != null) {
            m.setRefType(REF_PHOTO);
            m.setRefId(req.photoId());
        }
        ChatMessage saved = messageRepo.save(m);

        // Sending implies I've read everything up to my own message.
        upsertMarker(roomId, callerId, saved.getCreatedAt());

        ChatMessageDto dto = ChatMessageDto.from(saved, photo, Map.of(), null);
        publishAfterCommit(roomId, "chat.message.created", dto);
        return dto;
    }

    /**
     * The photo must be one the caller put in this gala's Dump (so nobody can repost someone
     * else's photo, or one from another gala, as their own) and finished uploading.
     */
    private ChatPhotoDto requireOwnPhoto(UUID roomId, UUID callerId, UUID photoId) {
        Photo p = photoRepo.findByIdAndRoom_Id(photoId, roomId)
                .filter(x -> callerId.equals(x.getUploadedBy()) && "READY".equals(x.getStatus()))
                .orElseThrow(InvalidPhotoReferenceException::new);
        return new ChatPhotoDto(p.getDriveFileId(), p.getMimeType());
    }

    /** Photos (by id) that the PHOTO messages on this page point at and that still exist. */
    private Map<UUID, ChatPhotoDto> photosFor(UUID roomId, List<ChatMessage> page) {
        Set<UUID> ids = new HashSet<>();
        for (ChatMessage m : page) {
            if (REF_PHOTO.equals(m.getRefType()) && m.getRefId() != null) ids.add(m.getRefId());
        }
        Map<UUID, ChatPhotoDto> out = new HashMap<>();
        if (ids.isEmpty()) return out;
        for (Photo p : photoRepo.findByRoom_IdAndIdIn(roomId, ids)) {
            out.put(p.getId(), new ChatPhotoDto(p.getDriveFileId(), p.getMimeType()));
        }
        return out;
    }

    private static ChatPhotoDto photoOf(ChatMessage m, Map<UUID, ChatPhotoDto> photos) {
        return REF_PHOTO.equals(m.getRefType()) ? photos.get(m.getRefId()) : null;
    }

    // ── Reactions (one per member per message; idempotent) ──────────────────

    /**
     * Sets the caller's reaction on a message ({@code null} removes it); picking a different one
     * replaces the old one. Broadcasts the new counts so every open chat updates.
     */
    public ChatMessageDto setReaction(UUID roomId, UUID messageId, UUID callerId, ReactionType reaction) {
        ChatMessage m = messageRepo.findByIdAndRoomId(messageId, roomId)
                .orElseThrow(ChatMessageNotFoundException::new);

        ChatReactionId id = new ChatReactionId(messageId, callerId);
        Optional<ChatReaction> existing = reactionRepo.findById(id);
        if (reaction == null) {
            existing.ifPresent(reactionRepo::delete);
        } else if (existing.isPresent()) {
            existing.get().setReaction(reaction);
        } else {
            reactionRepo.save(new ChatReaction(id, reaction));
        }
        reactionRepo.flush();

        Map<ReactionType, Long> counts = new EnumMap<>(ReactionType.class);
        for (Object[] row : reactionRepo.countByMessageIds(List.of(messageId))) {
            counts.put((ReactionType) row[1], (Long) row[2]);
        }
        ChatMessageDto dto = ChatMessageDto.from(m, null, counts, reaction);

        // HashMap, not Map.of: "reaction" is null when it was removed.
        Map<String, Object> event = new HashMap<>();
        event.put("messageId", messageId);
        event.put("userId", callerId);
        event.put("reaction", reaction);
        event.put("reactions", dto.reactions());
        event.put("hearted", reaction == ReactionType.HEART);
        event.put("heartCount", dto.heartCount());
        publishAfterCommit(roomId, "chat.reaction.changed", event);
        return dto;
    }

    /** The original heart toggle: a heart on, or the caller's reaction (whatever it is) off. */
    public ChatMessageDto setHeart(UUID roomId, UUID messageId, UUID callerId, boolean on) {
        return setReaction(roomId, messageId, callerId, on ? ReactionType.HEART : null);
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

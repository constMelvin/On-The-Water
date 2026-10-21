package com.gala.otw_server.chat.service;

import com.gala.otw_server.chat.dto.ChatMessageDto;
import com.gala.otw_server.chat.dto.ChatMessageDto.ChatPhotoDto;
import com.gala.otw_server.chat.dto.ChatMessageDto.ReplyToDto;
import com.gala.otw_server.chat.dto.ReactorDto;
import com.gala.otw_server.chat.dto.SendMessageRequest;
import com.gala.otw_server.chat.dto.UnreadDto;
import com.gala.otw_server.chat.entity.*;
import com.gala.otw_server.chat.repository.ChatMessageMentionRepository;
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
import com.gala.otw_server.notification.dto.RoomNotificationEvent;
import com.gala.otw_server.notification.entity.NotificationType;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import org.springframework.context.ApplicationEventPublisher;
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

    /** Most members one message can @mention (de-duplicated, without the sender). */
    private static final int MAX_MENTIONS = 20;

    /** @everyone notifies the whole gala, so it gets its own, tighter limit: 3 per 10 minutes. */
    private static final int MAX_EVERYONE_PER_WINDOW = 3;
    private static final Duration EVERYONE_WINDOW = Duration.ofMinutes(10);

    /** {@code ref_type} of a message that carries a Gala Dump photo. */
    public static final String REF_PHOTO = "PHOTO";

    private final ChatMessageRepository messageRepo;
    private final ChatReactionRepository reactionRepo;
    private final ChatReadMarkerRepository markerRepo;
    private final RateLimiterService rateLimiter;
    private final RealtimeEventPublisher realtime;
    private final PhotoRepository photoRepo;
    private final ChatMessageMentionRepository mentionRepo;
    private final RoomMemberRepository memberRepo;
    private final ApplicationEventPublisher events;

    public ChatService(ChatMessageRepository messageRepo,
                       ChatReactionRepository reactionRepo,
                       ChatReadMarkerRepository markerRepo,
                       RateLimiterService rateLimiter,
                       RealtimeEventPublisher realtime,
                       PhotoRepository photoRepo,
                       ChatMessageMentionRepository mentionRepo,
                       RoomMemberRepository memberRepo,
                       ApplicationEventPublisher events) {
        this.messageRepo = messageRepo;
        this.reactionRepo = reactionRepo;
        this.markerRepo = markerRepo;
        this.rateLimiter = rateLimiter;
        this.realtime = realtime;
        this.photoRepo = photoRepo;
        this.mentionRepo = mentionRepo;
        this.memberRepo = memberRepo;
        this.events = events;
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

        Map<UUID, ChatMessage> originals = originalsFor(roomId, page);
        List<ChatMessage> withOriginals = new ArrayList<>(page);
        withOriginals.addAll(originals.values());
        Map<UUID, ChatPhotoDto> photos = photosFor(roomId, withOriginals);
        Map<UUID, List<UUID>> mentions = new HashMap<>();
        if (!ids.isEmpty()) {
            for (ChatMessageMention mention : mentionRepo.findByIdMessageIdIn(ids)) {
                mentions.computeIfAbsent(mention.getId().getMessageId(), k -> new ArrayList<>())
                        .add(mention.getId().getUserId());
            }
        }

        List<ChatMessageDto> dtos = page.stream()
                .map(m -> {
                    ChatMessage original = m.getReplyToMessageId() == null ? null : originals.get(m.getReplyToMessageId());
                    ReplyToDto replyTo = original == null ? null : ReplyToDto.of(original, photoOf(original, photos) != null);
                    return ChatMessageDto.from(m, photoOf(m, photos),
                            counts.getOrDefault(m.getId(), Map.of()), mine.get(m.getId()),
                            replyTo, mentions.getOrDefault(m.getId(), List.of()));
                })
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

        ChatMessage original = req.replyToMessageId() == null ? null : requireReplyTarget(roomId, req.replyToMessageId());
        List<UUID> mentions = requireMentionable(roomId, callerId, req.mentionedUserIds());
        boolean everyone = Boolean.TRUE.equals(req.mentionEveryone());
        if (everyone) {
            rateLimiter.checkRateLimit("ratelimit:chat:everyone:" + callerId, MAX_EVERYONE_PER_WINDOW, EVERYONE_WINDOW);
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
        m.setReplyToMessageId(original == null ? null : original.getId());
        m.setMentionsEveryone(everyone);
        ChatMessage saved = messageRepo.save(m);
        if (!mentions.isEmpty()) {
            mentionRepo.saveAll(mentions.stream()
                    .map(u -> new ChatMessageMention(new ChatMessageMentionId(saved.getId(), u)))
                    .toList());
        }

        // Sending implies I've read everything up to my own message.
        upsertMarker(roomId, callerId, saved.getCreatedAt());

        ReplyToDto replyTo = original == null ? null : ReplyToDto.of(original, hasPhoto(roomId, original));
        ChatMessageDto dto = ChatMessageDto.from(saved, photo, Map.of(), null, replyTo, mentions);
        publishAfterCommit(roomId, "chat.message.created", dto);
        notifyMentionsAndReply(roomId, callerId, saved, original, mentions);
        return dto;
    }

    /** A reply must quote a TEXT message (photo messages included) of the same gala. */
    private ChatMessage requireReplyTarget(UUID roomId, UUID messageId) {
        return messageRepo.findByIdAndRoomId(messageId, roomId)
                .filter(o -> o.getKind() == MessageKind.TEXT)
                .orElseThrow(() -> new InvalidRequestException("Can't reply to that message"));
    }

    /** De-duplicated mentions without the sender; every one must be an active member of this gala. */
    private List<UUID> requireMentionable(UUID roomId, UUID callerId, List<UUID> requested) {
        if (requested == null || requested.isEmpty()) return List.of();
        LinkedHashSet<UUID> ids = new LinkedHashSet<>(requested);
        ids.remove(null);
        ids.remove(callerId);
        if (ids.size() > MAX_MENTIONS) {
            throw new InvalidRequestException("You can mention at most " + MAX_MENTIONS + " members");
        }
        if (ids.isEmpty()) return List.of();
        if (memberRepo.findByRoom_IdAndUserIdInAndLeftAtIsNull(roomId, ids).size() != ids.size()) {
            throw new InvalidRequestException("You can only mention members of this gala");
        }
        return List.copyOf(ids);
    }

    private boolean hasPhoto(UUID roomId, ChatMessage m) {
        return photoOf(m, photosFor(roomId, List.of(m))) != null;
    }

    /**
     * One notification per person: @everyone covers the whole gala; otherwise each mentioned
     * member gets a MENTION and the replied-to author a REPLY unless already mentioned.
     * Delivered after commit by NotificationEventListener.
     */
    private void notifyMentionsAndReply(UUID roomId, UUID callerId, ChatMessage saved,
                                        ChatMessage original, List<UUID> mentions) {
        UUID replyAuthor = original == null ? null : original.getSenderUserId();
        boolean notifyAuthor = replyAuthor != null && !replyAuthor.equals(callerId) && !mentions.contains(replyAuthor);
        if (!saved.isMentionsEveryone() && mentions.isEmpty() && !notifyAuthor) return;

        RoomMember sender = memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId).orElse(null);
        if (sender == null) return;
        String nick = sender.getNickname();
        String body = sender.getRoom().getTitle() + ": "
                + (saved.getBody().isEmpty() ? "sent a photo" : ChatMessageDto.snippetOf(saved.getBody()));

        if (saved.isMentionsEveryone()) {
            events.publishEvent(RoomNotificationEvent.toRoom(roomId, NotificationType.MENTION, callerId,
                    nick + " mentioned everyone", body));
            return;
        }
        for (UUID target : mentions) {
            events.publishEvent(RoomNotificationEvent.toMember(roomId, NotificationType.MENTION, callerId, target,
                    nick + " mentioned you", body));
        }
        if (notifyAuthor) {
            events.publishEvent(RoomNotificationEvent.toMember(roomId, NotificationType.REPLY, callerId, replyAuthor,
                    nick + " replied to you", body));
        }
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

    /** The messages (by id) that the replies on this page quote, in one query. */
    private Map<UUID, ChatMessage> originalsFor(UUID roomId, List<ChatMessage> page) {
        Set<UUID> ids = new HashSet<>();
        for (ChatMessage m : page) {
            if (m.getReplyToMessageId() != null) ids.add(m.getReplyToMessageId());
        }
        Map<UUID, ChatMessage> out = new HashMap<>();
        if (ids.isEmpty()) return out;
        for (ChatMessage m : messageRepo.findByRoomIdAndIdIn(roomId, ids)) out.put(m.getId(), m);
        return out;
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

    /**
     * Who reacted to a message, newest first, optionally one reaction only (a tab of the sheet).
     * The cursor is the user id of the last reactor the client has.
     */
    @Transactional(readOnly = true)
    public PageResponse<ReactorDto> getReactors(UUID roomId, UUID messageId, ReactionType reaction,
                                                UUID cursorUserId, int limit) {
        messageRepo.findByIdAndRoomId(messageId, roomId).orElseThrow(ChatMessageNotFoundException::new);

        OffsetDateTime cursorAt = com.gala.otw_server.common.CursorBounds.NEWEST;
        UUID cursorId = null;
        if (cursorUserId != null) {
            ChatReaction c = reactionRepo.findById(new ChatReactionId(messageId, cursorUserId)).orElse(null);
            if (c != null) {
                cursorAt = c.getCreatedAt();
                cursorId = cursorUserId;
            }
        }

        List<ChatReaction> rows = reactionRepo.findPage(messageId, reaction, cursorAt, cursorId, PageRequest.of(0, limit + 1));
        boolean hasMore = rows.size() > limit;
        List<ReactorDto> items = rows.stream().limit(limit).map(ReactorDto::from).toList();
        String nextCursor = (hasMore && !items.isEmpty()) ? items.get(items.size() - 1).userId().toString() : null;
        return PageResponse.of(items, nextCursor, limit);
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

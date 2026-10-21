package com.gala.otw_server.chat;

import com.gala.otw_server.chat.dto.ChatMessageDto;
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
import com.gala.otw_server.common.DomainExceptions.TooManyRequestsException;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.photo.entity.Photo;
import com.gala.otw_server.photo.repository.PhotoRepository;
import com.gala.otw_server.chat.service.ChatService;
import com.gala.otw_server.ratelimit.RateLimiterService;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.notification.dto.RoomNotificationEvent;
import com.gala.otw_server.notification.entity.NotificationType;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock private ChatMessageRepository messageRepo;
    @Mock private ChatReactionRepository reactionRepo;
    @Mock private ChatReadMarkerRepository markerRepo;
    @Mock private RateLimiterService rateLimiter;
    @Mock private RealtimeEventPublisher realtime;
    @Mock private PhotoRepository photoRepo;
    @Mock private ChatMessageMentionRepository mentionRepo;
    @Mock private RoomMemberRepository memberRepo;
    @Mock private ApplicationEventPublisher events;

    private ChatService chatService;

    private final UUID roomId = UUID.randomUUID();
    private final UUID me = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        chatService = new ChatService(messageRepo, reactionRepo, markerRepo, rateLimiter, realtime, photoRepo,
                mentionRepo, memberRepo, events);
    }

    private ChatMessage message(UUID sender, String body, OffsetDateTime at) {
        ChatMessage m = new ChatMessage();
        m.setId(UUID.randomUUID());
        m.setRoomId(roomId);
        m.setSenderUserId(sender);
        m.setKind(sender == null ? MessageKind.SYSTEM : MessageKind.TEXT);
        m.setBody(body);
        m.setCreatedAt(at);
        return m;
    }

    @Test
    @DisplayName("send trims the body, stores a TEXT message, marks it read for me, and broadcasts it")
    void send() {
        when(messageRepo.save(any(ChatMessage.class))).thenAnswer(inv -> {
            ChatMessage m = inv.getArgument(0);
            m.setId(UUID.randomUUID());
            m.setCreatedAt(OffsetDateTime.now());
            return m;
        });
        when(markerRepo.findById(any())).thenReturn(Optional.empty());

        ChatMessageDto dto = chatService.send(roomId, me, new SendMessageRequest("  G ako!  "));

        assertThat(dto.body()).isEqualTo("G ako!");
        assertThat(dto.kind()).isEqualTo(MessageKind.TEXT);
        assertThat(dto.senderUserId()).isEqualTo(me);
        verify(rateLimiter).checkRateLimit("ratelimit:chat:" + me, 20, Duration.ofMinutes(1));
        verify(markerRepo).save(any(ChatReadMarker.class));
        verify(realtime).publish(eq(roomId), eq("chat.message.created"), any());
    }

    @Test
    @DisplayName("send is blocked by the per-member chat rate limit")
    void send_rateLimited() {
        doThrow(new TooManyRequestsException("slow down"))
                .when(rateLimiter).checkRateLimit(anyString(), anyInt(), any(Duration.class));

        assertThatThrownBy(() -> chatService.send(roomId, me, new SendMessageRequest("spam")))
                .isInstanceOf(TooManyRequestsException.class);
        verify(messageRepo, never()).save(any());
    }

    @Test
    @DisplayName("getMessages returns a newest-first page with heart counts and my reactions")
    void getMessages() {
        OffsetDateTime now = OffsetDateTime.now();
        ChatMessage newest = message(UUID.randomUUID(), "Check the Gastos tab.", now);
        ChatMessage older = message(me, "Magkano ba?", now.minusMinutes(1));
        ChatMessage oldest = message(null, "Alex joined the gala.", now.minusMinutes(2));
        when(messageRepo.findPage(eq(roomId), eq(com.gala.otw_server.common.CursorBounds.NEWEST), isNull(), any())).thenReturn(List.of(newest, older, oldest));
        when(reactionRepo.countByMessageIds(List.of(newest.getId(), older.getId())))
                .thenReturn(List.<Object[]>of(
                        new Object[]{newest.getId(), ReactionType.HEART, 2L},
                        new Object[]{newest.getId(), ReactionType.HAHA, 1L}));
        when(reactionRepo.findMyReactions(List.of(newest.getId(), older.getId()), me))
                .thenReturn(List.<Object[]>of(new Object[]{newest.getId(), ReactionType.HEART}));

        PageResponse<ChatMessageDto> page = chatService.getMessages(roomId, me, null, 2);

        assertThat(page.items()).extracting(ChatMessageDto::body).containsExactly("Check the Gastos tab.", "Magkano ba?");
        assertThat(page.items().get(0).heartCount()).isEqualTo(2);
        assertThat(page.items().get(0).reactedByMe()).isTrue();
        assertThat(page.items().get(0).reactions())
                .containsEntry(ReactionType.HEART, 2L).containsEntry(ReactionType.HAHA, 1L);
        assertThat(page.items().get(0).myReaction()).isEqualTo(ReactionType.HEART);
        assertThat(page.items().get(1).heartCount()).isZero();
        assertThat(page.items().get(1).myReaction()).isNull();
        assertThat(page.nextCursor()).isEqualTo(older.getId().toString());
    }

    @Test
    @DisplayName("setHeart adds a reaction once (idempotent) and broadcasts the new count")
    void heart() {
        ChatMessage m = message(UUID.randomUUID(), "hi", OffsetDateTime.now());
        when(messageRepo.findByIdAndRoomId(m.getId(), roomId)).thenReturn(Optional.of(m));
        when(reactionRepo.findById(any())).thenReturn(Optional.empty());
        when(reactionRepo.countByMessageIds(List.of(m.getId())))
                .thenReturn(List.<Object[]>of(new Object[]{m.getId(), ReactionType.HEART, 1L}));

        ChatMessageDto dto = chatService.setHeart(roomId, m.getId(), me, true);

        assertThat(dto.heartCount()).isEqualTo(1);
        assertThat(dto.reactedByMe()).isTrue();
        verify(reactionRepo).save(any(ChatReaction.class));
        verify(realtime).publish(eq(roomId), eq("chat.reaction.changed"), any());
    }

    @Test
    @DisplayName("setReaction replaces my existing reaction instead of adding a second one")
    void reactionReplaces() {
        ChatMessage m = message(UUID.randomUUID(), "hi", OffsetDateTime.now());
        when(messageRepo.findByIdAndRoomId(m.getId(), roomId)).thenReturn(Optional.of(m));
        ChatReaction mine = new ChatReaction(new ChatReactionId(m.getId(), me), ReactionType.HEART);
        when(reactionRepo.findById(any())).thenReturn(Optional.of(mine));
        when(reactionRepo.countByMessageIds(List.of(m.getId())))
                .thenReturn(List.<Object[]>of(new Object[]{m.getId(), ReactionType.HAHA, 1L}));

        ChatMessageDto dto = chatService.setReaction(roomId, m.getId(), me, ReactionType.HAHA);

        assertThat(mine.getReaction()).isEqualTo(ReactionType.HAHA);
        assertThat(dto.myReaction()).isEqualTo(ReactionType.HAHA);
        assertThat(dto.reactions()).containsOnlyKeys(ReactionType.HAHA);
        assertThat(dto.reactedByMe()).isFalse();
        verify(reactionRepo, never()).save(any());
    }

    @Test
    @DisplayName("setReaction(null) removes my reaction and broadcasts a null reaction")
    void reactionRemoved() {
        ChatMessage m = message(UUID.randomUUID(), "hi", OffsetDateTime.now());
        when(messageRepo.findByIdAndRoomId(m.getId(), roomId)).thenReturn(Optional.of(m));
        ChatReaction mine = new ChatReaction(new ChatReactionId(m.getId(), me), ReactionType.WOW);
        when(reactionRepo.findById(any())).thenReturn(Optional.of(mine));
        when(reactionRepo.countByMessageIds(List.of(m.getId()))).thenReturn(List.of());

        ChatMessageDto dto = chatService.setReaction(roomId, m.getId(), me, null);

        verify(reactionRepo).delete(mine);
        assertThat(dto.myReaction()).isNull();
        assertThat(dto.reactions()).isEmpty();
        verify(realtime).publish(eq(roomId), eq("chat.reaction.changed"),
                argThat(p -> p instanceof java.util.Map<?, ?> map
                        && map.containsKey("reaction") && map.get("reaction") == null));
    }

    @Test
    @DisplayName("setHeart on a message from another room is 404")
    void heart_otherRoom() {
        UUID id = UUID.randomUUID();
        when(messageRepo.findByIdAndRoomId(id, roomId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> chatService.setHeart(roomId, id, me, true))
                .isInstanceOf(ChatMessageNotFoundException.class);
    }

    @Test
    @DisplayName("getUnread counts messages after my marker and points at the first one")
    void unread() {
        OffsetDateTime lastRead = OffsetDateTime.now().minusMinutes(5);
        ChatReadMarker marker = new ChatReadMarker(new ChatReadMarkerId(roomId, me), lastRead);
        ChatMessage first = message(UUID.randomUUID(), "Wait, magkano?", OffsetDateTime.now().minusMinutes(1));
        when(markerRepo.findById(new ChatReadMarkerId(roomId, me))).thenReturn(Optional.of(marker));
        when(messageRepo.countUnread(roomId, me, lastRead)).thenReturn(2L);
        when(messageRepo.findFirstUnread(eq(roomId), eq(me), eq(lastRead), any())).thenReturn(List.of(first));

        UnreadDto dto = chatService.getUnread(roomId, me);

        assertThat(dto.count()).isEqualTo(2);
        assertThat(dto.firstUnreadId()).isEqualTo(first.getId());
    }

    @Test
    @DisplayName("getUnread with nothing new returns 0 and no divider")
    void unread_none() {
        when(markerRepo.findById(any())).thenReturn(Optional.empty());
        // No marker: the service binds the epoch, never null (a null bind breaks on PostgreSQL).
        when(messageRepo.countUnread(roomId, me, OffsetDateTime.ofInstant(java.time.Instant.EPOCH, java.time.ZoneOffset.UTC)))
                .thenReturn(0L);

        UnreadDto dto = chatService.getUnread(roomId, me);

        assertThat(dto.count()).isZero();
        assertThat(dto.firstUnreadId()).isNull();
        verify(messageRepo, never()).findFirstUnread(any(), any(), any(), any());
    }

    // ── Photo messages ────────────────────────────────────────────────────────

    private Photo photo(UUID uploadedBy, String status) {
        Photo p = mock(Photo.class);
        lenient().when(p.getUploadedBy()).thenReturn(uploadedBy);
        lenient().when(p.getStatus()).thenReturn(status);
        lenient().when(p.getDriveFileId()).thenReturn("drive-1");
        lenient().when(p.getMimeType()).thenReturn("image/jpeg");
        return p;
    }

    private void saveEchoes() {
        when(messageRepo.save(any(ChatMessage.class))).thenAnswer(inv -> {
            ChatMessage m = inv.getArgument(0);
            m.setId(UUID.randomUUID());
            m.setCreatedAt(OffsetDateTime.now());
            return m;
        });
        when(markerRepo.findById(any())).thenReturn(Optional.empty());
    }

    @Test
    @DisplayName("send with my own Dump photo stores a PHOTO ref, allows an empty caption and returns the photo")
    void sendPhoto() {
        UUID photoId = UUID.randomUUID();
        Photo p = photo(me, "READY");
        when(photoRepo.findByIdAndRoom_Id(photoId, roomId)).thenReturn(Optional.of(p));
        saveEchoes();

        ChatMessageDto dto = chatService.send(roomId, me, new SendMessageRequest("   ", photoId));

        assertThat(dto.body()).isEmpty();
        assertThat(dto.refType()).isEqualTo("PHOTO");
        assertThat(dto.refId()).isEqualTo(photoId);
        assertThat(dto.photo()).isEqualTo(new ChatMessageDto.ChatPhotoDto("drive-1", "image/jpeg"));
        verify(realtime).publish(eq(roomId), eq("chat.message.created"), any());
    }

    @Test
    @DisplayName("send rejects a photo that someone else uploaded")
    void sendPhotoNotMine() {
        UUID photoId = UUID.randomUUID();
        Photo p = photo(UUID.randomUUID(), "READY");
        when(photoRepo.findByIdAndRoom_Id(photoId, roomId)).thenReturn(Optional.of(p));

        assertThatThrownBy(() -> chatService.send(roomId, me, new SendMessageRequest("look", photoId)))
                .isInstanceOf(InvalidPhotoReferenceException.class);
        verify(messageRepo, never()).save(any());
    }

    @Test
    @DisplayName("send rejects a photo from another gala")
    void sendPhotoOtherRoom() {
        UUID photoId = UUID.randomUUID();
        when(photoRepo.findByIdAndRoom_Id(photoId, roomId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> chatService.send(roomId, me, new SendMessageRequest(null, photoId)))
                .isInstanceOf(InvalidPhotoReferenceException.class);
        verify(messageRepo, never()).save(any());
    }

    @Test
    @DisplayName("send without a photo still needs text")
    void sendEmpty() {
        assertThatThrownBy(() -> chatService.send(roomId, me, new SendMessageRequest("   ")))
                .isInstanceOf(InvalidRequestException.class);
        verify(messageRepo, never()).save(any());
    }

    @Test
    @DisplayName("getMessages attaches existing photos and leaves deleted ones null")
    void getMessagesWithPhotos() {
        UUID kept = UUID.randomUUID();
        UUID gone = UUID.randomUUID();
        ChatMessage a = message(me, "", OffsetDateTime.now());
        a.setRefType("PHOTO");
        a.setRefId(kept);
        ChatMessage b = message(me, "", OffsetDateTime.now().minusMinutes(1));
        b.setRefType("PHOTO");
        b.setRefId(gone);
        when(messageRepo.findPage(eq(roomId), any(), any(), any())).thenReturn(List.of(a, b));
        Photo p = photo(me, "READY");
        when(p.getId()).thenReturn(kept);
        when(photoRepo.findByRoom_IdAndIdIn(eq(roomId), anyCollection())).thenReturn(List.of(p));

        PageResponse<ChatMessageDto> page = chatService.getMessages(roomId, me, null, 50);

        assertThat(page.items().get(0).photo()).isNotNull();
        assertThat(page.items().get(1).photo()).isNull();
    }

    // ── Replies and mentions ──────────────────────────────────────────────────

    @Test
    @DisplayName("getMessages attaches the replied-to message (120-char snippet) and the mentions")
    void getMessages_includesReplyAndMentions() {
        UUID other = UUID.randomUUID();
        ChatMessage original = message(other, "x".repeat(200), OffsetDateTime.now().minusMinutes(5));
        ChatMessage reply = message(me, "oo nga", OffsetDateTime.now());
        reply.setReplyToMessageId(original.getId());
        when(messageRepo.findPage(eq(roomId), any(), any(), any())).thenReturn(List.of(reply));
        when(messageRepo.findByRoomIdAndIdIn(roomId, Set.of(original.getId()))).thenReturn(List.of(original));
        when(mentionRepo.findByIdMessageIdIn(List.of(reply.getId())))
                .thenReturn(List.of(new ChatMessageMention(new ChatMessageMentionId(reply.getId(), other))));

        ChatMessageDto dto = chatService.getMessages(roomId, me, null, 30).items().get(0);

        assertThat(dto.replyTo().id()).isEqualTo(original.getId());
        assertThat(dto.replyTo().senderUserId()).isEqualTo(other);
        assertThat(dto.replyTo().snippet()).hasSize(120);
        assertThat(dto.replyTo().hasPhoto()).isFalse();
        assertThat(dto.mentions()).containsExactly(other);
        assertThat(dto.mentionsEveryone()).isFalse();
    }

    private final UUID other = UUID.randomUUID();
    private final UUID third = UUID.randomUUID();

    /** I'm "Mia" in the gala "Boracay 2026". */
    private void senderIsMia() {
        Room room = mock(Room.class);
        lenient().when(room.getTitle()).thenReturn("Boracay 2026");
        RoomMember rm = mock(RoomMember.class);
        lenient().when(rm.getNickname()).thenReturn("Mia");
        lenient().when(rm.getRoom()).thenReturn(room);
        lenient().when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, me)).thenReturn(Optional.of(rm));
    }

    /** Only these users are active members (besides me). */
    @SuppressWarnings("unchecked")
    private void activeMembers(UUID... ids) {
        Set<UUID> active = Set.of(ids);
        lenient().when(memberRepo.findByRoom_IdAndUserIdInAndLeftAtIsNull(eq(roomId), anyCollection())).thenAnswer(inv -> {
            List<RoomMember> out = new ArrayList<>();
            for (UUID id : (Collection<UUID>) inv.getArgument(1)) {
                if (active.contains(id)) out.add(mock(RoomMember.class));
            }
            return out;
        });
    }

    private ChatMessage existing(UUID sender, MessageKind kind) {
        ChatMessage m = message(sender, "Sino may dalang speaker?", OffsetDateTime.now().minusMinutes(3));
        m.setKind(kind);
        when(messageRepo.findByIdAndRoomId(m.getId(), roomId)).thenReturn(Optional.of(m));
        return m;
    }

    private List<RoomNotificationEvent> notifications() {
        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(events, atLeast(0)).publishEvent(captor.capture());
        return captor.getAllValues().stream()
                .filter(RoomNotificationEvent.class::isInstance).map(RoomNotificationEvent.class::cast).toList();
    }

    private static SendMessageRequest req(String body, UUID replyTo, List<UUID> mentions, Boolean everyone) {
        return new SendMessageRequest(body, null, replyTo, mentions, everyone);
    }

    @Test
    @DisplayName("send rejects a reply to a message from another gala")
    void send_replyOtherRoom() {
        UUID foreign = UUID.randomUUID();
        when(messageRepo.findByIdAndRoomId(foreign, roomId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> chatService.send(roomId, me, req("oo", foreign, null, null)))
                .isInstanceOf(InvalidRequestException.class);
        verify(messageRepo, never()).save(any());
    }

    @Test
    @DisplayName("send rejects a reply to a system line")
    void send_replyToSystem() {
        ChatMessage sys = existing(null, MessageKind.SYSTEM);

        assertThatThrownBy(() -> chatService.send(roomId, me, req("oo", sys.getId(), null, null)))
                .isInstanceOf(InvalidRequestException.class);
        verify(messageRepo, never()).save(any());
    }

    @Test
    @DisplayName("send rejects a mention of someone who is not an active member")
    void send_mentionNonMember() {
        activeMembers(other);

        assertThatThrownBy(() -> chatService.send(roomId, me, req("@x", null, List.of(other, third), null)))
                .isInstanceOf(InvalidRequestException.class);
        verify(messageRepo, never()).save(any());
    }

    @Test
    @DisplayName("send allows 20 mentions after dropping me, rejects 21")
    void send_tooManyMentions() {
        List<UUID> twentyOne = new ArrayList<>();
        for (int i = 0; i < 21; i++) twentyOne.add(UUID.randomUUID());
        activeMembers(twentyOne.toArray(UUID[]::new));
        assertThatThrownBy(() -> chatService.send(roomId, me, req("hi all", null, twentyOne, null)))
                .isInstanceOf(InvalidRequestException.class);

        List<UUID> twentyPlusMe = new ArrayList<>(twentyOne.subList(0, 20));
        twentyPlusMe.add(me);
        senderIsMia();
        saveEchoes();
        ChatMessageDto dto = chatService.send(roomId, me, req("hi all", null, twentyPlusMe, null));
        assertThat(dto.mentions()).hasSize(20).doesNotContain(me);
    }

    @Test
    @DisplayName("send drops my own id from the mentions and notifies only the others")
    void send_selfMentionDropped() {
        activeMembers(other);
        senderIsMia();
        saveEchoes();

        ChatMessageDto dto = chatService.send(roomId, me, req("@Mia @Jo", null, List.of(me, other), null));

        assertThat(dto.mentions()).containsExactly(other);
        verify(mentionRepo).saveAll(argThat((Iterable<ChatMessageMention> rows) -> {
            List<UUID> users = new ArrayList<>();
            rows.forEach(r -> users.add(r.getId().getUserId()));
            return users.equals(List.of(other));
        }));
        List<RoomNotificationEvent> sent = notifications();
        assertThat(sent).hasSize(1);
        assertThat(sent.get(0).type()).isEqualTo(NotificationType.MENTION);
        assertThat(sent.get(0).targetUserId()).isEqualTo(other);
        assertThat(sent.get(0).title()).isEqualTo("Mia mentioned you");
        assertThat(sent.get(0).body()).isEqualTo("Boracay 2026: @Mia @Jo");
    }

    @Test
    @DisplayName("replying to someone I also mention notifies them once (as a mention)")
    void send_replyAlsoMentioned() {
        ChatMessage original = existing(other, MessageKind.TEXT);
        activeMembers(other);
        senderIsMia();
        saveEchoes();

        chatService.send(roomId, me, req("@Jo ako!", original.getId(), List.of(other), null));

        List<RoomNotificationEvent> sent = notifications();
        assertThat(sent).hasSize(1);
        assertThat(sent.get(0).type()).isEqualTo(NotificationType.MENTION);
    }

    @Test
    @DisplayName("a reply notifies the author of the original and carries the quote")
    void send_replyNotifiesAuthor() {
        ChatMessage original = existing(other, MessageKind.TEXT);
        senderIsMia();
        saveEchoes();

        ChatMessageDto dto = chatService.send(roomId, me, req("ako!", original.getId(), null, null));

        assertThat(dto.replyTo().id()).isEqualTo(original.getId());
        List<RoomNotificationEvent> sent = notifications();
        assertThat(sent).hasSize(1);
        assertThat(sent.get(0).type()).isEqualTo(NotificationType.REPLY);
        assertThat(sent.get(0).targetUserId()).isEqualTo(other);
        assertThat(sent.get(0).title()).isEqualTo("Mia replied to you");
    }

    @Test
    @DisplayName("replying to my own message notifies nobody")
    void send_replyToMyself() {
        ChatMessage original = existing(me, MessageKind.TEXT);
        saveEchoes();

        chatService.send(roomId, me, req("dagdag pa", original.getId(), null, null));

        assertThat(notifications()).isEmpty();
    }

    @Test
    @DisplayName("@everyone sends one room-wide mention instead of the reply and individual ones")
    void send_everyoneSupersedes() {
        ChatMessage original = existing(other, MessageKind.TEXT);
        activeMembers(third);
        senderIsMia();
        saveEchoes();

        ChatMessageDto dto = chatService.send(roomId, me, req("@everyone @Kai alis na", original.getId(), List.of(third), true));

        assertThat(dto.mentionsEveryone()).isTrue();
        verify(rateLimiter).checkRateLimit("ratelimit:chat:everyone:" + me, 3, Duration.ofMinutes(10));
        List<RoomNotificationEvent> sent = notifications();
        assertThat(sent).hasSize(1);
        assertThat(sent.get(0).type()).isEqualTo(NotificationType.MENTION);
        assertThat(sent.get(0).targetUserId()).isNull();
        assertThat(sent.get(0).actorUserId()).isEqualTo(me);
        assertThat(sent.get(0).title()).isEqualTo("Mia mentioned everyone");
    }

    @Test
    @DisplayName("@everyone past its own rate limit is refused and nothing is saved")
    void send_everyoneRateLimited() {
        // lenient: the normal per-member chat limit is checked first with a different key.
        lenient().doThrow(new TooManyRequestsException("slow down"))
                .when(rateLimiter).checkRateLimit(eq("ratelimit:chat:everyone:" + me), anyInt(), any(Duration.class));

        assertThatThrownBy(() -> chatService.send(roomId, me, req("@everyone", null, null, true)))
                .isInstanceOf(TooManyRequestsException.class);
        verify(messageRepo, never()).save(any());
    }

    // ── Who reacted ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("getReactors on a message from another gala is 404")
    void getReactors_otherRoom() {
        UUID id = UUID.randomUUID();
        when(messageRepo.findByIdAndRoomId(id, roomId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> chatService.getReactors(roomId, id, null, null, 50))
                .isInstanceOf(ChatMessageNotFoundException.class);
    }

    @Test
    @DisplayName("getReactors returns a newest-first page whose cursor is the last reactor")
    void getReactors_pages() {
        ChatMessage m = existing(other, MessageKind.TEXT);
        OffsetDateTime now = OffsetDateTime.now();
        List<ChatReaction> rows = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            ChatReaction r = new ChatReaction(new ChatReactionId(m.getId(), UUID.randomUUID()), ReactionType.HEART);
            r.setCreatedAt(now.minusMinutes(i));
            rows.add(r);
        }
        when(reactionRepo.findPage(eq(m.getId()), isNull(), any(), isNull(), any())).thenReturn(rows);

        PageResponse<ReactorDto> page = chatService.getReactors(roomId, m.getId(), null, null, 2);

        assertThat(page.items()).extracting(ReactorDto::userId)
                .containsExactly(rows.get(0).getId().getUserId(), rows.get(1).getId().getUserId());
        assertThat(page.items().get(0).reaction()).isEqualTo(ReactionType.HEART);
        assertThat(page.nextCursor()).isEqualTo(rows.get(1).getId().getUserId().toString());
    }
}

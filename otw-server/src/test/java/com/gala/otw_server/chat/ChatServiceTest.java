package com.gala.otw_server.chat;

import com.gala.otw_server.chat.dto.ChatMessageDto;
import com.gala.otw_server.chat.dto.SendMessageRequest;
import com.gala.otw_server.chat.dto.UnreadDto;
import com.gala.otw_server.chat.entity.*;
import com.gala.otw_server.chat.repository.ChatMessageRepository;
import com.gala.otw_server.chat.repository.ChatReactionRepository;
import com.gala.otw_server.chat.repository.ChatReadMarkerRepository;
import com.gala.otw_server.common.DomainExceptions.ChatMessageNotFoundException;
import com.gala.otw_server.common.DomainExceptions.TooManyRequestsException;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.chat.service.ChatService;
import com.gala.otw_server.ratelimit.RateLimiterService;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
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

    private ChatService chatService;

    private final UUID roomId = UUID.randomUUID();
    private final UUID me = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        chatService = new ChatService(messageRepo, reactionRepo, markerRepo, rateLimiter, realtime);
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
                .thenReturn(List.<Object[]>of(new Object[]{newest.getId(), 2L}));
        when(reactionRepo.findReactedMessageIds(List.of(newest.getId(), older.getId()), me))
                .thenReturn(List.of(newest.getId()));

        PageResponse<ChatMessageDto> page = chatService.getMessages(roomId, me, null, 2);

        assertThat(page.items()).extracting(ChatMessageDto::body).containsExactly("Check the Gastos tab.", "Magkano ba?");
        assertThat(page.items().get(0).heartCount()).isEqualTo(2);
        assertThat(page.items().get(0).reactedByMe()).isTrue();
        assertThat(page.items().get(1).heartCount()).isZero();
        assertThat(page.nextCursor()).isEqualTo(older.getId().toString());
    }

    @Test
    @DisplayName("setHeart adds a reaction once (idempotent) and broadcasts the new count")
    void heart() {
        ChatMessage m = message(UUID.randomUUID(), "hi", OffsetDateTime.now());
        when(messageRepo.findByIdAndRoomId(m.getId(), roomId)).thenReturn(Optional.of(m));
        when(reactionRepo.existsById(any())).thenReturn(false);
        when(reactionRepo.countByIdMessageId(m.getId())).thenReturn(1L);

        ChatMessageDto dto = chatService.setHeart(roomId, m.getId(), me, true);

        assertThat(dto.heartCount()).isEqualTo(1);
        assertThat(dto.reactedByMe()).isTrue();
        verify(reactionRepo).save(any(ChatReaction.class));
        verify(realtime).publish(eq(roomId), eq("chat.reaction.changed"), any());
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
}

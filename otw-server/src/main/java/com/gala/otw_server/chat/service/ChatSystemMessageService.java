package com.gala.otw_server.chat.service;

import com.gala.otw_server.chat.dto.ChatMessageDto;
import com.gala.otw_server.chat.entity.ChatMessage;
import com.gala.otw_server.chat.entity.MessageKind;
import com.gala.otw_server.chat.repository.ChatMessageRepository;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

/**
 * Posts the automatic chat lines the artifact shows ("Sam changed their status to I'm G.",
 * "Jamie added a new itinerary stop"). Runs inside the caller's transaction so the chat
 * line and the change it describes commit or roll back together; the realtime event goes
 * out after commit like every other mutation.
 */
@Service
@Transactional(propagation = Propagation.MANDATORY)
public class ChatSystemMessageService {

    public static final String REF_ITINERARY_ITEM = "ITINERARY_ITEM";
    public static final String REF_EXPENSE = "EXPENSE";

    private static final int MAX_BODY = 1000;

    private final ChatMessageRepository messageRepo;
    private final RealtimeEventPublisher realtime;

    public ChatSystemMessageService(ChatMessageRepository messageRepo, RealtimeEventPublisher realtime) {
        this.messageRepo = messageRepo;
        this.realtime = realtime;
    }

    /** A plain system line with no sender. */
    public void system(UUID roomId, String body) {
        post(roomId, null, MessageKind.SYSTEM, body, null, null);
    }

    /** A planner card attributed to the member who made the change. */
    public void card(UUID roomId, UUID actorUserId, String body, String refType, UUID refId) {
        post(roomId, actorUserId, MessageKind.CARD, body, refType, refId);
    }

    private void post(UUID roomId, UUID senderUserId, MessageKind kind, String body, String refType, UUID refId) {
        ChatMessage m = new ChatMessage();
        m.setRoomId(roomId);
        m.setSenderUserId(senderUserId);
        m.setKind(kind);
        m.setBody(body.length() > MAX_BODY ? body.substring(0, MAX_BODY) : body);
        m.setRefType(refType);
        m.setRefId(refId);
        ChatMessage saved = messageRepo.save(m);

        ChatMessageDto dto = ChatMessageDto.from(saved);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    realtime.publish(roomId, "chat.message.created", dto);
                }
            });
        } else {
            realtime.publish(roomId, "chat.message.created", dto);
        }
    }
}

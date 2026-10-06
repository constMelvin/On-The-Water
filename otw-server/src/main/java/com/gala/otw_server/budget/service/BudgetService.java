package com.gala.otw_server.budget.service;

import com.gala.otw_server.budget.dto.BudgetDto;
import com.gala.otw_server.budget.dto.UpdateBudgetRequest;
import com.gala.otw_server.budget.entity.BudgetEstimate;
import com.gala.otw_server.budget.repository.BudgetEstimateRepository;
import com.gala.otw_server.common.DomainExceptions.RoomNotFoundException;
import com.gala.otw_server.notification.dto.RoomNotificationEvent;
import com.gala.otw_server.notification.entity.NotificationType;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.entity.RsvpStatus;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.room.service.RoomPermissionService;
import com.gala.otw_server.room.service.RoomPermissionService.Permission;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Service
@Transactional
public class BudgetService {

    private static final int COUPLE_PARTICIPANTS = 2;

    private final BudgetEstimateRepository budgetRepo;
    private final RoomRepository roomRepo;
    private final RoomMemberRepository memberRepo;
    private final RoomPermissionService permissions;
    private final RealtimeEventPublisher realtime;
    private final ApplicationEventPublisher events;

    public BudgetService(BudgetEstimateRepository budgetRepo,
                         RoomRepository roomRepo,
                         RoomMemberRepository memberRepo,
                         RoomPermissionService permissions,
                         RealtimeEventPublisher realtime,
                         ApplicationEventPublisher events) {
        this.budgetRepo = budgetRepo;
        this.roomRepo = roomRepo;
        this.memberRepo = memberRepo;
        this.permissions = permissions;
        this.realtime = realtime;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public BudgetDto getBudget(UUID roomId) {
        Room room = findRoom(roomId);
        return budgetRepo.findById(roomId)
                .map(BudgetDto::from)
                .orElseGet(() -> BudgetDto.empty(roomId, defaultParticipants(room)));
    }

    /** Host always; members only while "Edit the plan" is on. */
    public BudgetDto setBudget(UUID roomId, UUID callerId, UpdateBudgetRequest req) {
        Room room = permissions.require(roomId, callerId, Permission.EDIT_PLAN);

        BudgetEstimate estimate = budgetRepo.findById(roomId).orElseGet(() -> {
            // Leave roomId null: @MapsId copies it from room on persist. Setting it here makes
            // save() treat the new row as detached and merge it, which fails ("null identifier").
            BudgetEstimate be = new BudgetEstimate();
            be.setRoom(room);
            return be;
        });

        estimate.setTransportAmount(amount(req.transportAmount()));
        estimate.setStayAmount(amount(req.stayAmount()));
        estimate.setFoodAmount(amount(req.foodAmount()));
        estimate.setActivitiesAmount(amount(req.activitiesAmount()));
        estimate.setOtherAmount(amount(req.otherAmount()));
        estimate.setEstimatedAmount(estimate.total());
        estimate.setParticipantCount(room.isCouple() ? COUPLE_PARTICIPANTS
                : req.participantCount() != null ? req.participantCount() : defaultParticipants(room));
        if (req.currency() != null && !req.currency().isBlank()) {
            estimate.setCurrency(req.currency().trim().toUpperCase());
        }
        estimate.setUpdatedBy(callerId);

        BudgetEstimate saved = budgetRepo.save(estimate);
        BudgetDto dto = BudgetDto.from(saved);

        publishAfterCommit(roomId, "budget.updated", dto);
        events.publishEvent(RoomNotificationEvent.toRoom(roomId, NotificationType.BUDGET_UPDATED, callerId,
                "Budget update", "The estimated budget for " + room.getTitle() + " is now "
                        + dto.perPerson().toPlainString() + " " + dto.currency() + " per person."));
        return dto;
    }

    /** The people stepper starts at the number of members who said "I'm G". */
    private int defaultParticipants(Room room) {
        if (room.isCouple()) return COUPLE_PARTICIPANTS;
        long going = memberRepo.findByRoom_IdAndLeftAtIsNull(room.getId()).stream()
                .map(RoomMember::getRsvpStatus)
                .filter(s -> s == RsvpStatus.GOING)
                .count();
        return (int) Math.max(1, going);
    }

    private static BigDecimal amount(BigDecimal v) {
        return v == null ? BigDecimal.ZERO.setScale(2) : v.setScale(2, RoundingMode.HALF_UP);
    }

    private Room findRoom(UUID roomId) {
        return roomRepo.findById(roomId).orElseThrow(RoomNotFoundException::new);
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

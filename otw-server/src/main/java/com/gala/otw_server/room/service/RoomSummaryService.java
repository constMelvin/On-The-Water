package com.gala.otw_server.room.service;

import com.gala.otw_server.budget.dto.BudgetDto;
import com.gala.otw_server.budget.service.BudgetService;
import com.gala.otw_server.chat.service.ChatService;
import com.gala.otw_server.common.DomainExceptions.RoomNotFoundException;
import com.gala.otw_server.expense.dto.SettlementDto;
import com.gala.otw_server.expense.service.ExpenseService;
import com.gala.otw_server.room.dto.RoomSummaryDto;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.repository.RoomRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * One call for the Gala Dashboard cards and the completed-gala recap. Counts come from
 * two aggregate queries; budget, settlement and unread reuse their own services so the
 * numbers always match the feature screens.
 */
@Service
@Transactional(readOnly = true)
public class RoomSummaryService {

    private final RoomRepository roomRepo;
    private final JdbcTemplate jdbc;
    private final GalaClock galaClock;
    private final BudgetService budgetService;
    private final ExpenseService expenseService;
    private final ChatService chatService;

    public RoomSummaryService(RoomRepository roomRepo,
                              JdbcTemplate jdbc,
                              GalaClock galaClock,
                              BudgetService budgetService,
                              ExpenseService expenseService,
                              ChatService chatService) {
        this.roomRepo = roomRepo;
        this.jdbc = jdbc;
        this.galaClock = galaClock;
        this.budgetService = budgetService;
        this.expenseService = expenseService;
        this.chatService = chatService;
    }

    private record MemberCounts(int members, RoomSummaryDto.Rsvp rsvp, RoomSummaryDto.Travel travel) {}

    private record ContentCounts(int stops, int checklistDone, int checklistTotal, int photos) {}

    public RoomSummaryDto getSummary(UUID roomId, UUID callerId) {
        Room room = roomRepo.findById(roomId).orElseThrow(RoomNotFoundException::new);

        MemberCounts m = jdbc.queryForObject("""
                SELECT COUNT(*) AS members,
                       COUNT(*) FILTER (WHERE rsvp_status = 'GOING')          AS going,
                       COUNT(*) FILTER (WHERE rsvp_status = 'MAYBE')          AS maybe,
                       COUNT(*) FILTER (WHERE rsvp_status = 'NOT_GOING')      AS not_going,
                       COUNT(*) FILTER (WHERE rsvp_status = 'PENDING')        AS pending,
                       COUNT(*) FILTER (WHERE travel_status = 'STILL_HOME')   AS still_home,
                       COUNT(*) FILTER (WHERE travel_status = 'ON_THE_WAY')   AS on_the_way,
                       COUNT(*) FILTER (WHERE travel_status = 'ALMOST_THERE') AS almost_there,
                       COUNT(*) FILTER (WHERE travel_status = 'ARRIVED')      AS arrived
                FROM room_members
                WHERE room_id = ? AND left_at IS NULL
                """, (rs, i) -> new MemberCounts(
                rs.getInt("members"),
                new RoomSummaryDto.Rsvp(rs.getInt("going"), rs.getInt("maybe"),
                        rs.getInt("not_going"), rs.getInt("pending")),
                new RoomSummaryDto.Travel(rs.getInt("still_home"), rs.getInt("on_the_way"),
                        rs.getInt("almost_there"), rs.getInt("arrived"))), roomId);

        ContentCounts c = jdbc.queryForObject("""
                SELECT (SELECT COUNT(*) FROM itinerary_items WHERE room_id = ?)                  AS stops,
                       (SELECT COUNT(*) FROM checklist_items WHERE room_id = ? AND is_done)      AS done,
                       (SELECT COUNT(*) FROM checklist_items WHERE room_id = ?)                  AS total,
                       (SELECT COUNT(*) FROM photos WHERE room_id = ? AND status = 'READY')      AS photos
                """, (rs, i) -> new ContentCounts(
                rs.getInt("stops"), rs.getInt("done"), rs.getInt("total"), rs.getInt("photos")),
                roomId, roomId, roomId, roomId);

        BudgetDto budget = budgetService.getBudget(roomId);
        SettlementDto settlement = expenseService.calculateSettlement(roomId, callerId);
        long unread = chatService.countUnread(roomId, callerId);

        return new RoomSummaryDto(
                galaClock.phaseOf(room),
                m.members(),
                m.rsvp(),
                m.travel(),
                c.stops(),
                c.checklistDone(),
                c.checklistTotal(),
                budget.estimatedAmount(),
                budget.perPerson(),
                settlement.totalExpenses(),
                settlement.settled(),
                c.photos(),
                unread);
    }
}

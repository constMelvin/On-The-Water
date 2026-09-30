package com.gala.otw_server.room.service;

import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.room.dto.MyRoomDto;
import com.gala.otw_server.room.dto.MyRoomStatsDto;
import com.gala.otw_server.room.repository.MyRoomQueryRepository;
import com.gala.otw_server.room.repository.MyRoomQueryRepository.Row;
import com.gala.otw_server.room.repository.MyRoomQueryRepository.View;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Account area: My Galas + Calendar, Gala History, and "Save this gala" (link account).
 * Paging uses an opaque offset cursor — lists are per-user and small.
 */
@Service
@Transactional(readOnly = true)
public class MeService {

    /** A calendar request covers at most about two months (month view + overflow weeks). */
    private static final long MAX_RANGE_DAYS = 62;

    private final MyRoomQueryRepository query;
    private final RoomMemberRepository memberRepo;
    private final GalaClock galaClock;

    public MeService(MyRoomQueryRepository query, RoomMemberRepository memberRepo, GalaClock galaClock) {
        this.query = query;
        this.memberRepo = memberRepo;
        this.galaClock = galaClock;
    }

    public PageResponse<MyRoomDto> getMyRooms(UUID userId, View view, String cursor, int limit) {
        int offset = parseCursor(cursor);
        List<Row> rows = query.findByView(userId, view, galaClock.today(), offset, limit + 1);
        return page(rows, offset, limit);
    }

    public PageResponse<MyRoomDto> getMyRoomsInRange(UUID userId, LocalDate from, LocalDate to, String cursor, int limit) {
        if (to.isBefore(from)) {
            throw new InvalidRequestException("'to' can't be before 'from'");
        }
        if (ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
            throw new InvalidRequestException("Calendar range can be at most " + MAX_RANGE_DAYS + " days");
        }
        int offset = parseCursor(cursor);
        List<Row> rows = query.findInRange(userId, from, to, offset, limit + 1);
        return page(rows, offset, limit);
    }

    public MyRoomStatsDto getStats(UUID userId) {
        LocalDate today = galaClock.today();
        return new MyRoomStatsDto(
                query.countCompleted(userId, today),
                query.countPeopleInCompleted(userId, today),
                query.countArchived(userId));
    }

    /**
     * Called after the frontend upgrades an anonymous session to an account
     * ({@code linkIdentity}/{@code updateUser} keep the same user id), so every gala
     * this person joined anonymously is now "saved" and protected from being claimed.
     */
    @Transactional
    public int linkAccount(UUID userId) {
        return memberRepo.markHasAccount(userId);
    }

    private PageResponse<MyRoomDto> page(List<Row> rows, int offset, int limit) {
        boolean hasMore = rows.size() > limit;
        List<MyRoomDto> items = rows.stream().limit(limit)
                .map(r -> new MyRoomDto(r.roomId(), r.title(), r.destination(), r.startDate(), r.endDate(),
                        r.type(), r.status(), galaClock.phaseOf(r.startDate(), r.endDate()), r.myRole(),
                        r.memberCount()))
                .toList();
        return PageResponse.of(items, hasMore ? String.valueOf(offset + limit) : null, limit);
    }

    private static int parseCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) return 0;
        try {
            int offset = Integer.parseInt(cursor);
            if (offset < 0) throw new NumberFormatException();
            return offset;
        } catch (NumberFormatException ex) {
            throw new InvalidRequestException("Invalid cursor");
        }
    }
}

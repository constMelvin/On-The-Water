package com.gala.otw_server.room.service;

import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.room.dto.DirectoryRoomDto;
import com.gala.otw_server.room.entity.RoomType;
import com.gala.otw_server.room.repository.RoomDirectoryQueryRepository;
import com.gala.otw_server.room.repository.RoomDirectoryQueryRepository.Row;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Join a Gala's list of every active gala. Paging uses an opaque offset cursor, like My Galas. */
@Service
@Transactional(readOnly = true)
public class RoomDirectoryService {

    private static final int COUPLE_MAX_MEMBERS = 2;
    private static final int MAX_OFFSET = 10_000;

    private final RoomDirectoryQueryRepository query;
    private final GalaClock galaClock;

    public RoomDirectoryService(RoomDirectoryQueryRepository query, GalaClock galaClock) {
        this.query = query;
        this.galaClock = galaClock;
    }

    public PageResponse<DirectoryRoomDto> list(UUID callerId, String search, String cursor, int limit) {
        int offset = parseCursor(cursor);
        List<Row> rows = query.find(callerId, galaClock.today(), search, offset, limit + 1);
        boolean hasMore = rows.size() > limit;
        List<DirectoryRoomDto> items = rows.stream().limit(limit)
                .map(r -> new DirectoryRoomDto(r.roomCode(), r.title(), r.destination(), r.startDate(), r.endDate(),
                        r.type(), r.hostNickname(), r.memberCount(),
                        r.type() == RoomType.COUPLE && r.memberCount() >= COUPLE_MAX_MEMBERS,
                        r.alreadyMember()))
                .toList();
        return PageResponse.of(items, hasMore ? String.valueOf(offset + limit) : null, limit);
    }

    private static int parseCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) return 0;
        try {
            return Math.max(0, Math.min(Integer.parseInt(cursor), MAX_OFFSET));
        } catch (NumberFormatException ex) {
            return 0;
        }
    }
}

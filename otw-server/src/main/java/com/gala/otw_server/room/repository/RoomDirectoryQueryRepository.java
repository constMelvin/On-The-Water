package com.gala.otw_server.room.repository;

import com.gala.otw_server.room.entity.RoomType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * The Join a Gala directory: every active (not archived) group gala. Couple galas are never
 * listed: they are joined only with a shared Gala Code + Gala Password. Upcoming and ongoing
 * ones first, soonest first; finished ones after. Joining still needs the Gala Password.
 */
@Repository
public class RoomDirectoryQueryRepository {

    public record Row(String roomCode, String title, String destination, LocalDate startDate, LocalDate endDate,
                      RoomType type, String hostNickname, int memberCount, boolean alreadyMember) {}

    private final JdbcTemplate jdbc;

    public RoomDirectoryQueryRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Row> find(UUID callerId, LocalDate today, String search, int offset, int limit) {
        List<Object> args = new ArrayList<>(List.of(callerId));
        StringBuilder sql = new StringBuilder("""
                SELECT r.room_code, r.title, r.destination, r.start_date, r.end_date, r.room_type,
                       (SELECT h.nickname FROM room_members h
                         WHERE h.room_id = r.id AND h.user_id = r.host_user_id AND h.left_at IS NULL) AS host_nickname,
                       (SELECT COUNT(*) FROM room_members x WHERE x.room_id = r.id AND x.left_at IS NULL) AS member_count,
                       EXISTS (SELECT 1 FROM room_members m
                                WHERE m.room_id = r.id AND m.user_id = ? AND m.left_at IS NULL) AS already_member
                FROM rooms r
                WHERE r.status = 'ACTIVE'
                  AND r.room_type <> 'COUPLE'
                """);
        if (search != null && !search.isBlank()) {
            sql.append(" AND (r.title ILIKE ? ESCAPE '!' OR r.destination ILIKE ? ESCAPE '!')");
            String like = "%" + search.trim().replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
            args.add(like);
            args.add(like);
        }
        sql.append(" ORDER BY (COALESCE(r.end_date, r.start_date) < ?) ASC, r.start_date ASC, r.id ASC OFFSET ? LIMIT ?");
        args.add(today);
        args.add(offset);
        args.add(limit);

        return jdbc.query(sql.toString(), (rs, i) -> {
            Date end = rs.getDate("end_date");
            return new Row(
                    rs.getString("room_code"),
                    rs.getString("title"),
                    rs.getString("destination"),
                    rs.getDate("start_date").toLocalDate(),
                    end == null ? null : end.toLocalDate(),
                    RoomType.valueOf(rs.getString("room_type")),
                    rs.getString("host_nickname"),
                    rs.getInt("member_count"),
                    rs.getBoolean("already_member"));
        }, args.toArray());
    }
}

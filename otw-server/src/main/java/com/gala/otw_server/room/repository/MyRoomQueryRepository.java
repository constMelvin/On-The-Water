package com.gala.otw_server.room.repository;

import com.gala.otw_server.room.entity.RoomType;
import com.gala.otw_server.security.auth.RoomRole;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * "My Galas" / calendar / history reads across every room the caller belongs to.
 * Plain SQL because each bucket is a date condition relative to "today" in the gala
 * timezone; all queries start from the {@code room_members(user_id)} index.
 */
@Repository
public class MyRoomQueryRepository {

    public enum View { ONGOING, UPCOMING, COMPLETED, ARCHIVED }

    public record Row(UUID roomId, String title, String destination, LocalDate startDate, LocalDate endDate,
                      RoomType type, String status, RoomRole myRole, int memberCount) {}

    private static final String SELECT = """
            SELECT r.id, r.title, r.destination, r.start_date, r.end_date, r.room_type, r.status, rm.role,
                   (SELECT COUNT(*) FROM room_members x WHERE x.room_id = r.id AND x.left_at IS NULL) AS member_count
            FROM room_members rm
            JOIN rooms r ON r.id = rm.room_id
            WHERE rm.user_id = ? AND rm.left_at IS NULL
            """;

    private final JdbcTemplate jdbc;

    public MyRoomQueryRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Row> findByView(UUID userId, View view, LocalDate today, int offset, int limit) {
        List<Object> args = new ArrayList<>(List.of(userId));
        String where;
        String order;
        switch (view) {
            case ONGOING -> {
                where = " AND r.status = 'ACTIVE' AND r.start_date <= ? AND COALESCE(r.end_date, r.start_date) >= ?";
                args.add(today);
                args.add(today);
                order = " ORDER BY r.start_date ASC, r.id ASC";
            }
            case UPCOMING -> {
                where = " AND r.status = 'ACTIVE' AND (r.start_date > ? OR r.start_date IS NULL)";
                args.add(today);
                order = " ORDER BY r.start_date ASC NULLS LAST, r.id ASC";
            }
            case COMPLETED -> {
                where = " AND r.status = 'ACTIVE' AND COALESCE(r.end_date, r.start_date) < ?";
                args.add(today);
                order = " ORDER BY r.start_date DESC, r.id ASC";
            }
            case ARCHIVED -> {
                where = " AND r.status = 'ARCHIVED'";
                order = " ORDER BY r.updated_at DESC, r.id ASC";
            }
            default -> throw new IllegalArgumentException("Unknown view " + view);
        }
        args.add(limit);
        args.add(offset);
        return jdbc.query(SELECT + where + order + " LIMIT ? OFFSET ?", this::mapRow, args.toArray());
    }

    /** Calendar month/week: active galas overlapping [from, to]. */
    public List<Row> findInRange(UUID userId, LocalDate from, LocalDate to, int offset, int limit) {
        return jdbc.query(SELECT + """
                         AND r.status = 'ACTIVE' AND r.start_date <= ? AND COALESCE(r.end_date, r.start_date) >= ?
                        ORDER BY r.start_date ASC, r.id ASC LIMIT ? OFFSET ?
                        """,
                this::mapRow, userId, to, from, limit, offset);
    }

    public int countCompleted(UUID userId, LocalDate today) {
        Integer n = jdbc.queryForObject("""
                SELECT COUNT(*) FROM room_members rm JOIN rooms r ON r.id = rm.room_id
                WHERE rm.user_id = ? AND rm.left_at IS NULL
                  AND r.status = 'ACTIVE' AND COALESCE(r.end_date, r.start_date) < ?
                """, Integer.class, userId, today);
        return n != null ? n : 0;
    }

    public int countArchived(UUID userId) {
        Integer n = jdbc.queryForObject("""
                SELECT COUNT(*) FROM room_members rm JOIN rooms r ON r.id = rm.room_id
                WHERE rm.user_id = ? AND rm.left_at IS NULL AND r.status = 'ARCHIVED'
                """, Integer.class, userId);
        return n != null ? n : 0;
    }

    /** Distinct other people across the caller's completed galas. */
    public int countPeopleInCompleted(UUID userId, LocalDate today) {
        Integer n = jdbc.queryForObject("""
                SELECT COUNT(DISTINCT x.user_id) FROM room_members x
                WHERE x.left_at IS NULL AND x.user_id <> ?
                  AND x.room_id IN (
                      SELECT r.id FROM room_members rm JOIN rooms r ON r.id = rm.room_id
                      WHERE rm.user_id = ? AND rm.left_at IS NULL
                        AND r.status = 'ACTIVE' AND COALESCE(r.end_date, r.start_date) < ?)
                """, Integer.class, userId, userId, today);
        return n != null ? n : 0;
    }

    private Row mapRow(java.sql.ResultSet rs, int i) throws java.sql.SQLException {
        return new Row(
                rs.getObject("id", UUID.class),
                rs.getString("title"),
                rs.getString("destination"),
                rs.getObject("start_date", LocalDate.class),
                rs.getObject("end_date", LocalDate.class),
                RoomType.valueOf(rs.getString("room_type")),
                rs.getString("status"),
                RoomRole.valueOf(rs.getString("role")),
                rs.getInt("member_count"));
    }
}

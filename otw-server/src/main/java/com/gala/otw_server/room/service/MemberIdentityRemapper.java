package com.gala.otw_server.room.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * "Which one are you?" — when an anonymous member comes back on a new device they get a
 * new Supabase {@code sub}. Claiming their old member row must carry over everything they
 * own in that room, or their stops, expenses and debts would belong to nobody.
 *
 * <p><b>Every room-scoped user-id column lives here.</b> When a migration adds a new
 * column holding a user id, add it to {@link #ROOM_SCOPED} (or a special case below) —
 * see the Structure vault note.
 *
 * <p>{@code room_members.user_id} and {@code rooms.host_user_id} are NOT in this list: the
 * caller updates those through the JPA entities so the persistence context stays consistent.
 *
 * <p>Precondition (checked by the caller): the new user has no rows at all in this room,
 * so no unique constraint can collide.
 */
@Component
public class MemberIdentityRemapper {

    /** table, column — tables with their own {@code room_id}. */
    static final List<String[]> ROOM_SCOPED = List.of(
            new String[]{"itinerary_items", "created_by"},
            new String[]{"checklist_items", "assigned_to"},
            new String[]{"checklist_items", "done_by"},
            new String[]{"budget_estimates", "updated_by"},
            new String[]{"expenses", "paid_by"},
            new String[]{"settlement_payments", "from_user_id"},
            new String[]{"settlement_payments", "to_user_id"},
            new String[]{"settlement_payments", "recorded_by"},
            new String[]{"photos", "uploaded_by"},
            new String[]{"chat_messages", "sender_user_id"},
            new String[]{"chat_read_markers", "user_id"},
            new String[]{"couple_saved_ideas", "saved_by"}
    );

    private final JdbcTemplate jdbc;

    public MemberIdentityRemapper(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void remap(UUID roomId, UUID oldUserId, UUID newUserId) {
        for (String[] tc : ROOM_SCOPED) {
            jdbc.update("UPDATE " + tc[0] + " SET " + tc[1] + " = ? WHERE room_id = ? AND " + tc[1] + " = ?",
                    newUserId, roomId, oldUserId);
        }

        // Child tables keyed through their parent.
        jdbc.update("""
                UPDATE expense_shares SET user_id = ?
                WHERE user_id = ? AND expense_id IN (SELECT id FROM expenses WHERE room_id = ?)
                """, newUserId, oldUserId, roomId);
        jdbc.update("""
                UPDATE chat_reactions SET user_id = ?
                WHERE user_id = ? AND message_id IN (SELECT id FROM chat_messages WHERE room_id = ?)
                """, newUserId, oldUserId, roomId);

        // A shared location is tied to the old device's session — drop it rather than move it.
        jdbc.update("DELETE FROM member_locations WHERE room_id = ? AND user_id = ?", roomId, oldUserId);
    }
}

package com.gala.otw_server.room;

import com.gala.otw_server.room.service.MemberIdentityRemapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MemberIdentityRemapperTest {

    @Test
    @DisplayName("remap moves every room-scoped user column from the old to the new user and drops the old location")
    void remap_touchesEveryUserColumn() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        UUID roomId = UUID.randomUUID(), oldUser = UUID.randomUUID(), newUser = UUID.randomUUID();

        new MemberIdentityRemapper(jdbc).remap(roomId, oldUser, newUser);

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc, atLeastOnce()).update(sql.capture(), any(Object[].class));
        List<String> statements = sql.getAllValues();
        String all = String.join("\n", statements);

        for (String expected : List.of(
                "itinerary_items SET created_by", "checklist_items SET assigned_to", "checklist_items SET done_by",
                "budget_estimates SET updated_by", "expenses SET paid_by", "expense_shares SET user_id",
                "settlement_payments SET from_user_id", "settlement_payments SET to_user_id",
                "settlement_payments SET recorded_by", "photos SET uploaded_by",
                "chat_messages SET sender_user_id", "chat_reactions SET user_id", "chat_read_markers SET user_id",
                "couple_saved_ideas SET saved_by", "DELETE FROM member_locations")) {
            assertThat(all).as("missing remap of %s", expected).contains(expected);
        }
        // Every statement is scoped to this room.
        assertThat(statements).allSatisfy(s -> assertThat(s).contains("room_id"));
    }
}

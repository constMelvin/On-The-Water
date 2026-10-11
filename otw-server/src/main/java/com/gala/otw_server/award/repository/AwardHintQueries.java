package com.gala.otw_server.award.repository;

import com.gala.otw_server.award.entity.AwardCategory.Hint;
import com.gala.otw_server.chat.entity.MessageKind;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * "Nominees to consider" counts from the gala's real data: how many times each person paid, ticked a
 * checklist item, added a stop, sent a message or uploaded a photo. Counts only, never money amounts.
 * Read-only nudges: the winner is always decided by the barkada's vote.
 */
@Repository
public class AwardHintQueries {

    @PersistenceContext
    private EntityManager em;

    /** userId to count, for one hint source (empty for NONE). */
    public Map<UUID, Long> counts(Hint hint, UUID roomId) {
        String jpql = switch (hint) {
            case PAID -> "SELECT e.paidBy, COUNT(e) FROM Expense e WHERE e.room.id = :r AND e.paidBy IS NOT NULL GROUP BY e.paidBy";
            case CHECKLIST -> "SELECT c.doneBy, COUNT(c) FROM ChecklistItem c WHERE c.room.id = :r AND c.done = true AND c.doneBy IS NOT NULL GROUP BY c.doneBy";
            case STOPS -> "SELECT i.createdBy, COUNT(i) FROM ItineraryItem i WHERE i.room.id = :r AND i.createdBy IS NOT NULL GROUP BY i.createdBy";
            case CHAT -> "SELECT m.senderUserId, COUNT(m) FROM ChatMessage m WHERE m.roomId = :r AND m.kind = :textKind AND m.senderUserId IS NOT NULL GROUP BY m.senderUserId";
            case PHOTOS -> "SELECT p.uploadedBy, COUNT(p) FROM Photo p WHERE p.room.id = :r GROUP BY p.uploadedBy";
            case NONE -> null;
        };
        Map<UUID, Long> out = new HashMap<>();
        if (jpql == null) return out;

        var query = em.createQuery(jpql, Object[].class).setParameter("r", roomId);
        if (hint == Hint.CHAT) query.setParameter("textKind", MessageKind.TEXT);
        List<Object[]> rows = query.getResultList();
        for (Object[] row : rows) {
            out.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        return out;
    }
}

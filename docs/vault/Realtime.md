---
source: master plan §8
---

# Realtime

Back to [[00-Index]]

The backend publishes to **Supabase Realtime Broadcast** on private channels named `room:{roomId}`, gated by room membership. Broadcast is used instead of raw Postgres Changes.

## Events
| Event | Trigger | Payload |
|---|---|---|
| `member.joined` / `member.left` | membership insert/soft-delete | `{userId, nickname}` |
| `member.rsvp.changed` | RSVP patch | `{userId, status}` |
| `itinerary.created` / `.updated` / `.completed` | itinerary write | full item DTO |
| `checklist.updated` | checklist write | full item DTO |
| `expense.created` | expense write | expense DTO (the client recomputes or refetches settlement) |
| `location.updated` | location write | `{userId, lat, lng, mode}`, sent to members who opted into seeing locations |

All events go to room members only.

## Rules
- Publish only through `RealtimeEventPublisher.publish(roomId, event, dto)`. Feature modules never call Supabase directly.
- Publish **after commit**, using `@TransactionalEventListener(phase = AFTER_COMMIT)` or `TransactionSynchronizationManager`.
- On reconnect, clients refetch the paginated GET. Realtime speeds up the UX; it is not the source of truth.
- Duplicate events are OK because clients apply them idempotently by ID + `version`/`updated_at`. Don't build exactly-once delivery.

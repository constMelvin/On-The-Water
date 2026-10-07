---
source: master plan §8
---

# Realtime

Back to [[00-Index]]

The backend publishes to **Supabase Realtime Broadcast** on private channels named `room:{roomId}`, gated by room membership. Broadcast is used instead of raw Postgres Changes.

How it's gated: every broadcast is sent with `private: true`, and **V16** adds RLS on `realtime.messages` so only active members (`left_at IS NULL`) whose room matches `realtime.topic()` can receive broadcast/presence or track presence. Clients cannot send broadcasts (only the service role can). V16 is a no-op on a non-Supabase Postgres. The frontend subscribes with `{ config: { private: true } }` in `otw-client/src/lib/otw/live.ts`, invalidates the matching React Query keys per event, and polls every 15 s while the channel isn't connected.

## Events
| Event | Trigger | Payload |
|---|---|---|
| `member.joined` / `member.left` | join (incl. rejoin), remove, leave | `{userId, nickname}` / `{userId}` |
| `member.rsvp.changed` | RSVP patch | `{userId, status}` |
| `member.reclaimed` / `member.updated` / `member.travel.changed` / `member.nudged` | Enter a Gala claim, nickname, travel status, nudge | `{memberId, userId}` / member DTO / `{userId, status}` / `{userId}` |
| `room.updated` / `room.code.changed` / `room.archived` / `room.restored` / `room.deleted` | gala settings | room DTO or `{roomId, …}` |
| `itinerary.created` / `.updated` / `.deleted` / `.reordered` | itinerary write | full item DTO / `{id}` / `[{id, position, version}]` |
| `checklist.updated` | checklist write (incl. claim, delete with `deleted: true`) | full item DTO |
| `budget.updated` | budget write | budget DTO |
| `expense.created` / `.deleted` | expense write | expense DTO / `{id}` |
| `settlement.payment.recorded` / `.deleted` | Mark paid / undo | payment DTO / `{id}` |
| `location.updated` | location write/stop | `{userId, lat, lng, mode}` / `{userId, deleted}` |
| `photo.added` / `photo.deleted` | photo write | photo DTO / `{id}` |
| `chat.message.created` / `chat.reaction.changed` | send (incl. photo), system/card line, reaction | message DTO / `{messageId, userId, reaction, reactions, hearted, heartCount}` |
| `couple.idea.changed` | save/unsave idea | `{key, saved}` |

All events go to room members only. Notifications are **not** realtime — the frontend polls `/me/notifications`. "Online now" is Supabase presence on the room channel (client-only).

## Rules
- Publish only through `RealtimeEventPublisher.publish(roomId, event, dto)`. Feature modules never call Supabase directly.
- Publish **after commit**, using `@TransactionalEventListener(phase = AFTER_COMMIT)` or `TransactionSynchronizationManager`.
- Automatic chat lines ("Sam changed their status to I'm G.") are written by `ChatSystemMessageService` inside the originating transaction, then broadcast after commit.
- Notification rows are written by `NotificationEventListener` after commit in their own transaction; failures are logged, never surfaced.
- On reconnect, clients refetch the paginated GET. Realtime speeds up the UX; it is not the source of truth.
- Duplicate events are OK because clients apply them idempotently by ID + `version`/`updated_at`. Don't build exactly-once delivery.

---
source: master plan §7
---

# Location Sharing (Pin + Live)

Back to [[00-Index]] · Table: [[Schema]] `member_locations` · Event: [[Realtime]] `location.updated`

Sharing is opt-in, per user and per room.

- **Pin**: a single coordinate stored with `share_mode = PIN`. It stays until replaced or removed.
- **Live**: the client calls `PUT /rooms/{roomId}/location` every 10–15 s (tune after load testing).
  - The latest point goes to Redis `room:{roomId}:locations` as a Hash of `userId → {lat,lng,updatedAt}`, or a GEO set.
  - Postgres keeps only the current row (upsert). There is **no history**.
  - `expires_at` = now + about 2 min, so a share that stops updating goes stale on its own. A job or Redis TTL sweeps expired rows every minute.
  - Every update broadcasts `location.updated`.

## Gala-day rules (2026-09-29)
- `expires_at` is capped at gala end (last day + end time, or 23:59:59 local) + 3 h; sharing after that → `403 PERMISSION_DISABLED`.
- The host can turn sharing off for the whole gala (`location_sharing_enabled`).
- Manual **travel status** (`room_members.travel_status`) works with or without GPS: `PUT /rooms/{roomId}/members/me/travel-status`. ETA text is computed on the client.
- Leaving a gala deletes the member's location row.
- Destination pin (V19, `rooms.destination_lat/lng`): the map shows it, and each sharing member's straight-line distance to it is computed on the client (nothing stored, no new endpoint).

## Security
- Use the same `@RequireRoomRole` guard. Never leak a location to a non-member.
- Apply a **hard rate limit**: at most one write per 3–5 s per user.
- "Stop sharing" must **hard-delete** both the Redis key and the Postgres row. A flag alone would still leak the location.

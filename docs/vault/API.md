---
source: master plan §4
---

# API Contract (`/api/v1`)

Back to [[00-Index]]

## Conventions
- JSON. Every call needs `Authorization: Bearer <supabase_jwt>` and a registered account; anonymous or email-less tokens → `401 ACCOUNT_REQUIRED` — see [[Auth]].
- Pagination is cursor-based: `?cursor=...&limit=20` (My Galas uses an opaque offset cursor).
- Errors use the shape `{ "code": "ROOM_NOT_FOUND", "message": "..." }`. Notable codes: `409 DUPLICATE_NICKNAME`; `401 ACCOUNT_REQUIRED`; `401 INVALID_GALA_PASSWORD`; `403 PERMISSION_DISABLED`; `409 ROOM_ARCHIVED`, `ROOM_FULL`, `HOST_CANNOT_LEAVE`, `ALREADY_CLAIMED`, `SETTLEMENT_MISMATCH`; `404 NOT_A_COUPLE_ROOM`; `400 INVALID_PHOTO_REFERENCE` (Drive validation failed).
- Every write endpoint has Bean Validation on its DTO and a role guard ([[Auth]]). Where relevant, it also emits a realtime event ([[Realtime]]) and evicts cache ([[Caching]]).
- ✱ = also allowed on an archived gala; other non-GET room endpoints return `409 ROOM_ARCHIVED` there.

## Endpoints — getting in
| Method | Path | Role |
|---|---|---|
| POST | `/rooms` (title, nickname, startDate, endDate?, startTime?, endTime?, destination, destinationLat?/Lng? (both or neither), password, type?) | Authenticated, 10/h per client |
| GET | `/rooms/preview?code=` | Authenticated, rate-limited |
| POST | `/rooms/join` (code with/without `OTW-`, nickname, **password required**) | Authenticated, rate-limited |
| GET | `/rooms/directory?q=&cursor=&limit=` (every active **group** gala; couple galas are code-only; password still required to join) | Authenticated |

## Endpoints — inside a gala
| Method | Path | Role |
|---|---|---|
| GET | `/rooms/{roomId}` (+ phase, permissions, myRole, memberCount) · `/summary` | Member |
| PATCH | `/rooms/{roomId}` details (changing `destination` without `destinationLat/Lng` clears the pin) + permissions · PUT `/password` · POST `/code` · POST `/archive` | Host |
| POST | `/rooms/{roomId}/restore` · DELETE `/rooms/{roomId}` | Host ✱ |
| GET | `/rooms/{roomId}/members` | Member |
| DELETE | `/rooms/{roomId}/members/{userId}` · POST `/members/{userId}/nudge` | Host |
| PATCH | `/rooms/{roomId}/members/me/rsvp` · PATCH `/members/me` (nickname) · PUT `/members/me/travel-status` | Member |
| POST | `/rooms/{roomId}/members/me/leave` | Member ✱ |
| GET / POST | `/rooms/{roomId}/itinerary` · POST `/itinerary/reorder` | Member (writes: edit-plan permission) |
| PATCH / DELETE | `/rooms/{roomId}/itinerary/{itemId}` | Member (item owner or host). PATCH needs `version` |
| GET / POST | `/rooms/{roomId}/checklist` (`?isDone=&mine=`) | Member |
| PATCH | `/rooms/{roomId}/checklist/{itemId}` (needs `version`) · POST `/{itemId}/claim` | Member |
| GET / PUT | `/rooms/{roomId}/budget` | Member / Member while "Edit the plan" is on (host always) |
| GET / POST | `/rooms/{roomId}/expenses` · DELETE `/{expenseId}` (payer or host) | Member |
| GET | `/rooms/{roomId}/expenses/settlement` (transfers, payments, me, settled) | Member |
| POST / DELETE | `/rooms/{roomId}/expenses/settlement/payments[/{paymentId}]` | Member (involved / recorder / host) |
| PUT / DELETE | `/rooms/{roomId}/location` · GET `/locations` | Member (opt-in) |
| GET / POST | `/rooms/{roomId}/photos` (`?mine=`) · DELETE `/{photoId}` | Member (permission toggles) |
| GET / POST | `/rooms/{roomId}/chat/messages` · PUT/DELETE `/messages/{id}/heart` · GET `/chat/unread` | Member |
| PUT | `/rooms/{roomId}/chat/read` | Member ✱ |
| GET · PUT/DELETE | `/rooms/{roomId}/couple/ideas` · `/couple/ideas/{key}` | Member (couple galas only) |

`POST /rooms/{roomId}/photos/uploads` (fileName, mimeType image/* or video/*, size ≤ 300 MB) returns a one-time Drive `uploadUrl` in this gala's own folder (folder created on first use; galas also get one when created); the browser PUTs the bytes straight to Google, no Google sign-in. `POST /rooms/{roomId}/photos` registers metadata only — the backend verifies the submitted `driveFileId` via a read-only Google Drive API call: it must be a real, non-trashed image or video inside that gala's own folder (the shared folder only for a gala without one), or `400 INVALID_PHOTO_REFERENCE`. Binary upload to Drive is the client's job. `/uploads` also requires an allowed extension matching the type (jpg/jpeg/png/gif/webp/heic/heif; mp4/mov/webm/m4v/3gp) or `400 INVALID_REQUEST`. `DELETE /photos/{id}` trashes the Drive file after commit; `DriveOrphanSweeper` trashes gala-folder files with no row (older than 24 h). Transient Drive errors (429/5xx) are retried with backoff.

## Endpoints — account (`/me`)
| Method | Path |
|---|---|
| GET | `/me/rooms?view=upcoming\|ongoing\|completed\|archived` or `?from=&to=` (≤62 days) · `/me/rooms/stats` · each item carries `roomCode` (8 chars, no `OTW-` prefix) so any device can route to `/gala/OTW-XXXX-XXXX` |
| GET / PUT | `/me/notification-preferences` |
| GET / PUT | `/me/profile` (nickname ≤20, status ≤40, color, photo data URL ≤65k chars; PUT replaces all) |
| GET | `/me/notifications` · `/me/notifications/unread-count` |
| PATCH / POST | `/me/notifications/{id}/read` · `/me/notifications/read-all` |

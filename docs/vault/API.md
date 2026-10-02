---
source: master plan §4
---

# API Contract (`/api/v1`)

Back to [[00-Index]]

## Conventions
- JSON. Every call needs `Authorization: Bearer <supabase_jwt>` and a registered account; anonymous or email-less tokens → `401 ACCOUNT_REQUIRED` — see [[Auth]].
- Pagination is cursor-based: `?cursor=...&limit=20` (My Galas uses an opaque offset cursor).
- Errors use the shape `{ "code": "ROOM_NOT_FOUND", "message": "..." }`. Notable codes: `409 DUPLICATE_NICKNAME`; `401 ACCOUNT_REQUIRED`; `401 INVALID_GALA_PASSWORD`; `403 PERMISSION_DISABLED`; `409 ROOM_ARCHIVED`, `ROOM_FULL`, `MEMBER_HAS_ACCOUNT`, `HOST_CANNOT_LEAVE`, `ALREADY_CLAIMED`, `SETTLEMENT_MISMATCH`; `404 NOT_A_COUPLE_ROOM`; `400 INVALID_PHOTO_REFERENCE` (Drive validation failed).
- Every write endpoint has Bean Validation on its DTO and a role guard ([[Auth]]). Where relevant, it also emits a realtime event ([[Realtime]]) and evicts cache ([[Caching]]).
- ✱ = also allowed on an archived gala; other non-GET room endpoints return `409 ROOM_ARCHIVED` there.

## Endpoints — getting in
| Method | Path | Role |
|---|---|---|
| POST | `/rooms` (title, nickname, startDate, endDate?, startTime?, endTime?, destination, password, type?) | Authenticated, 10/h per client |
| GET | `/rooms/preview?code=` | Authenticated, rate-limited |
| POST | `/rooms/join` (code with/without `OTW-`, nickname) | Authenticated, rate-limited |
| POST | `/rooms/enter` · `/rooms/enter/claim` | Authenticated, rate-limited |

## Endpoints — inside a gala
| Method | Path | Role |
|---|---|---|
| GET | `/rooms/{roomId}` (+ phase, permissions, myRole, memberCount) · `/summary` | Member |
| PATCH | `/rooms/{roomId}` details + permissions · PUT `/password` · POST `/code` · POST `/archive` | Host |
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

`POST /rooms/{roomId}/photos` registers metadata only — the backend verifies the submitted `driveFileId` via a read-only Google Drive API call: it must be a real, non-trashed image or video in the configured shared folder, or `400 INVALID_PHOTO_REFERENCE`. Binary upload to Drive is the client's job.

## Endpoints — account (`/me`)
| Method | Path |
|---|---|
| GET | `/me/rooms?view=upcoming\|ongoing\|completed\|archived` or `?from=&to=` (≤62 days) · `/me/rooms/stats` · each item carries `roomCode` (8 chars, no `OTW-` prefix) so any device can route to `/gala/OTW-XXXX-XXXX` |
| GET / PUT | `/me/notification-preferences` |
| GET | `/me/notifications` · `/me/notifications/unread-count` |
| PATCH / POST | `/me/notifications/{id}/read` · `/me/notifications/read-all` |

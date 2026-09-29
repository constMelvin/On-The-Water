---
source: master plan §4
---

# API Contract (`/api/v1`)

Back to [[00-Index]]

## Conventions
- JSON. Every call needs `Authorization: Bearer <supabase_jwt>`, including the join endpoints.
- Pagination is cursor-based: `?cursor=...&limit=20`.
- Errors use the shape `{ "code": "ROOM_NOT_FOUND", "message": "..." }`. Notable codes: `409 DUPLICATE_NICKNAME` on `POST /rooms/join`; `401 ACCOUNT_REQUIRED` (distinct from `401 UNAUTHENTICATED`) when the token is a rejected anonymous session — see [[Auth]]; `400 INVALID_PHOTO_REFERENCE` on `POST /rooms/{roomId}/photos` when the submitted driveFileId fails Google Drive validation (see the photos row below).
- Every write endpoint has Bean Validation on its DTO and a role guard ([[Auth]]). Where relevant, it also emits a realtime event ([[Realtime]]) and evicts cache ([[Caching]]).

## Endpoints
| Method | Path | Role |
|---|---|---|
| POST | `/rooms` | Authenticated (standalone room) |
| GET | `/rooms/{roomId}` | Member |
| POST | `/rooms/join` | Authenticated |
| GET | `/rooms/{roomId}/members` | Member |
| DELETE | `/rooms/{roomId}/members/{userId}` | Host |
| PATCH | `/rooms/{roomId}/members/me/rsvp` | Member |
| GET / POST | `/rooms/{roomId}/itinerary` | Member |
| PATCH / DELETE | `/rooms/{roomId}/itinerary/{itemId}` | Member (item owner or host). PATCH needs `version` |
| GET / POST | `/rooms/{roomId}/checklist` | Member |
| PATCH | `/rooms/{roomId}/checklist/{itemId}` | Member. Needs `version` |
| GET / PUT | `/rooms/{roomId}/budget` | Member / Host |
| GET / POST | `/rooms/{roomId}/expenses` | Member (GET is paginated; POST includes shares) |
| GET | `/rooms/{roomId}/expenses/settlement` | Member (computed "who owes who") |
| PUT / DELETE | `/rooms/{roomId}/location` | Member (opt-in) |
| GET | `/rooms/{roomId}/locations` | Member |
| POST | `/rooms/{roomId}/photos` | Member (registers metadata only — backend verifies the submitted `driveFileId` via a read-only Google Drive API call: it must be a real, non-trashed image or video in the configured shared folder, or `400 INVALID_PHOTO_REFERENCE`. Binary upload to Drive is the client's job.) |

Note: the §5.3 matrix lists "Delete expense (host / payer only)" and "Edit room details (host)", but §4 defines **no endpoint** for either. Flag this before building them.

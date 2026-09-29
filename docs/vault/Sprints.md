---
source: master plan §2, §12, §13
---

# Sprints & Open Items

Back to [[00-Index]]

## Sprint plan (§12)
| Sprint | Deliverables | Exit gate |
|---|---|---|
| 0 Discovery | Plan approved; ERD and API frozen | Team can say what the backend exposes |
| 1 Foundation | Skeleton, Flyway V1 (rooms/members), JWT filter, CI | An invalid token is rejected |
| 2 Room | Create/join room, membership, RSVP, `@RequireRoomRole` guard | Two users can join the same room, and a third person can't see it |
| 3 Collaboration | Itinerary, checklist (optimistic locking), realtime publisher | Two clients see each other's changes live |
| 4 Money | Budget, expenses, shares, settlement | Settlement is correct, including uneven splits |
| 5 Performance + Fun | Redis caching, rate limiting, location | Cache-failure test passes; live location broadcasts |
| 6 Hardening | Security sweep, load test, docs | Release checklist fully checked |

## Open items (§13). Don't assume these; flag them.
- What are the exact room-code format and collision-retry strategy?
- Should settlement support partial or "settled" state? (For MVP, the plan recommends a purely calculated view.)
- What should the live-location interval and expiry window be?

**Resolved 2026-09-29:** Group/barkada tier removed (see [[Schema]], [[Auth]]). Anonymous auth is not acceptable — a registered account (email/OTP or password) is required for every non-public endpoint.

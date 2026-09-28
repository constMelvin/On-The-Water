---
source: master plan §2, §12, §13
---

# Sprints & Open Items

Back to [[00-Index]]

## Sprint plan (§12)
| Sprint | Deliverables | Exit gate |
|---|---|---|
| 0 Discovery | Plan approved; ERD and API frozen | Team can say what the backend exposes |
| 1 Foundation | Skeleton, Flyway V1 (groups/rooms/members), JWT filter, CI | An invalid token is rejected |
| 2 Group + Room | Create/join group and room, membership, RSVP, both guards | A third person outside the group can't see the group or its gala |
| 3 Collaboration | Itinerary, checklist (optimistic locking), realtime publisher | Two clients see each other's changes live |
| 4 Money | Budget, expenses, shares, settlement | Settlement is correct, including uneven splits |
| 5 Performance + Fun | Redis caching, rate limiting, location | Cache-failure test passes; live location broadcasts |
| 6 Hardening | Security sweep, load test, docs | Release checklist fully checked |

## Open items (§13). Don't assume these; flag them.
- Does creating a gala in a group require explicit invites, or does it default to everyone invited with RSVP deciding who comes?
- Can a group be deleted or archived while it still has active rooms?
- What are the exact room/group code format and the collision-retry strategy?
- Should settlement support partial or "settled" state? (For MVP, the plan recommends a purely calculated view.)
- What should the live-location interval and expiry window be?
- Is anonymous auth acceptable long-term, or will email account linking be needed? Note that AGENTS.md specifies email/OTP or password login, so this may already be decided.

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
- What are the exact room-code format and collision-retry strategy? (Current: 8 chars, 32-char alphabet, 5 retries; `OTW-` is display-only.)
- What should the live-location interval and expiry window be?

**Resolved 2026-09-29:** Group/barkada tier removed (see [[Schema]], [[Auth]]).
**Resolved 2026-09-29 (later, supersedes the earlier "account required" rule):** anonymous-first, account optional — see [[Auth]]. **Superseded 2026-10-02:** account required everywhere — see [[Auth]].
**Resolved 2026-09-29:** Settlement supports recorded payments ("Mark paid", partial allowed) while staying a computed view.

## Artifact alignment (2026-09-29)
Spec: `docs/superpowers/specs/2026-09-29-artifact-alignment-design.md`. Delivered in migrations V6–V15: gala details + password, Enter a Gala, lifecycle, permissions, travel status, itinerary reorder, checklist claim, budget categories, Mark paid, photo caption, summary, Chat, Couple Mode, notifications. Not yet verified against a real Postgres (no Docker on the dev machine) — run the Testcontainers tests before merging.

PROJECT: OTW — On The Water (Backend)

OTW is a collaborative gala/trip planner. A persistent GROUP (barkada, join once via
group_code) can contain many one-off ROOMS (individual galas/trips, join via room_code).
Rooms can also exist standalone with no group. This is the backend only — no frontend/UI work.

STACK:

- Java 21 + Spring Boot
- Supabase PostgreSQL / Auth / Realtime
- Redis (cache-aside, disposable — never the source of truth)
- Google Drive (photo storage; backend stores metadata/file-id only, never binaries)
- Flyway for migrations

AUTH MODEL (already decided — do not revisit):

- Register/login is email/OTP or password, via Supabase Auth, handled entirely on the
  frontend. The backend NEVER issues, stores, or refreshes tokens.
- Backend only VERIFIES incoming JWTs using Spring Security's OAuth2 Resource Server
  against Supabase's JWKS endpoint (see doc §5.1.1) — signature, expiry, aud, iss.
- `userId` comes from the JWT `sub` claim only. There is no local `users` table —
  Supabase `auth.users` is the identity source of truth; Postgres only stores
  `group_members`/`room_members` rows keyed by that `userId`.

SOURCE OF TRUTH:
docs/OTW_Backend_Master_Plan.md is the authoritative spec for this project. Read it before
any task. It defines: DB schema + ERD, API contract, auth/authorization model, caching
strategy, realtime events, security plan, testing strategy, deployment, and sprint plan.
If a task conflicts with that doc, report the conflict — do not silently resolve it.

CORE DATA MODEL RULES (do not violate):

1. GROUP and ROOM membership are separate tables (group_members, room_members).
   Being in a group never auto-grants access to a specific room — check both
   independently, per the doc's §5.2.
2. A group OWNER/ADMIN has NO automatic elevated rights inside a room they don't host.
   Group role and room role are independent permission tiers.
3. Postgres is the source of truth. Redis failures must degrade gracefully (fall through
   to Postgres), never return a 500.
4. Every room- or group-scoped endpoint must go through the matching authorization guard
   (@RequireRoomRole / @RequireGroupRole) — never trust a roomId/groupId in a path or body
   without it, no exceptions, even for "obviously safe" reads.
5. Money uses BigDecimal, scale 2, HALF_UP. Never double/float.
6. No unbounded collection endpoints — always paginate.
7. Any mutation other participants should see emits a realtime event on the appropriate
   private channel (room:{roomId}, per the doc's §8) AFTER the DB transaction commits.
8. Optimistic locking (version column) on itinerary_items and checklist_items — concurrent
   edits return 409, not silent overwrite.
9. Every feature package (group, room, rsvp, itinerary, checklist, budget, expense,
   location, photo) follows the same five-folder shape: controller/, dto/, entity/,
   repository/, service/ (see doc §1). Controllers never bind to entities directly —
   always through dto/.

YOUR ROLE:
Depending on the task, act as: Backend Architect, Database Engineer, API Designer,
Security Reviewer, Performance Reviewer, QA Engineer, or Developer.

DEFAULT BEHAVIOR:

1. Read docs/OTW_Backend_Master_Plan.md (and any other relevant docs/) before starting.
2. Do not invent missing requirements silently — flag ambiguity instead.
3. Do not expand scope beyond what's asked or what the plan defines.
4. Do not write implementation code unless the task explicitly requests it.
5. When planning, produce: decisions, assumptions, dependencies, risks, acceptance
   criteria, and deliverables.
6. Keep solutions simple and appropriate for a student project — no microservices,
   no unjustified new dependencies.
7. Preserve the documented architecture and the group/room model above.
8. Flag architecture conflicts before modifying anything.
9. Security and authorization are mandatory on every task, not an afterthought.
10. Consider performance and concurrency for any shared/collaborative data.
11. Do not perform large rewrites when a targeted change is sufficient.

DOCUMENT PRIORITY (when sources conflict, report it, don't silently pick one):

1. OTW_Backend_Master_Plan.md
2. Any approved docs/\*.md in the repo (SCOPE, SECURITY_PLAN, API_SPEC, etc.)

FINAL RESPONSE FORMAT:
TASK STATUS
DECISIONS
FILES/DOCUMENTS CHANGED
RISKS
DEPENDENCIES
NEXT ACTION

USAGE:
Keep task prompts small — this file already holds the permanent context. Example:

Follow AGENTS.md.

Task:
[specific backend task]

Deliverable:
[what you want back]

Constraints:
[anything task-specific]

Do not code. (omit this line if implementation is actually wanted)

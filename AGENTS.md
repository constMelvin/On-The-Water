PROJECT: OTW — On The Water (Backend)

OTW is a collaborative gala/trip planner. Every ROOM (an individual gala/trip, joined via
room_code) is standalone — there is no persistent group/barkada tier above it (removed
2026-09-29; see docs/OTW_Backend_Master_Plan.md's changelog and docs/vault/Schema.md).
This is the backend only — no frontend/UI work.

STACK:

- Java 21 + Spring Boot
- Supabase PostgreSQL / Auth / Realtime
- Redis (cache-aside, disposable — never the source of truth)
- Google Drive (photo + video storage; backend stores metadata/file-id only, never binaries —
  it verifies a client-supplied driveFileId via a read-only Drive API call before
  marking a photo READY, see the `photo` package's GoogleDriveFileValidator). Since
  2026-10-05 (owner decision) the backend may also CREATE one folder per gala
  (`GalaDriveFolderService`), open one-time resumable upload links the browser PUTs bytes
  to (`DriveUploadSessionService`), and make uploaded files viewable by link. It signs in as
  the owner's Google account (refresh token) or a service account (Shared Drive only).
  Uploads must land in that gala's folder.
- Flyway for migrations

AUTH MODEL (already decided — do not revisit; revised 2026-10-02 by the project owner —
see the master plan changelog):

- Register/login is email + password via Supabase Auth (OAuth providers are planned), handled
  entirely on the frontend. The backend NEVER issues, stores, or refreshes tokens.
- Backend only VERIFIES incoming JWTs using Spring Security's OAuth2 Resource Server
  against Supabase's JWKS endpoint (see doc §5.1.1) — signature, expiry, aud, iss.
- Account required everywhere (revised 2026-10-02 by the project owner; reverses the
  2026-09-29 anonymous-first rule): Supabase anonymous sessions are REJECTED. `AccountRequiredFilter`
  returns `401 ACCOUNT_REQUIRED` for any token that is anonymous or has no `email` claim, on every
  route except the public/health/docs paths. There is no per-endpoint annotation; new endpoints are
  protected by default. Supabase "Allow anonymous sign-ins" must stay OFF in the dashboard.
  The API gate is global; direct Supabase access (PostgREST/Realtime) depends on RLS + that
  dashboard setting, and RLS does not check `is_anonymous` (see master plan §5.4).
- "Enter a Gala" (code + password → "Which one are you?", `/rooms/enter`, `MemberIdentityRemapper`)
  was REMOVED 2026-10-07 (owner decision). Join a Gala is the only way in; a device that lost its
  room id reopens the gala from My Galas (`/me/galas`).
- `userId` comes from the JWT `sub` claim only. There is no local `users` table —
  Supabase `auth.users` is the identity source of truth; Postgres only stores
  `room_members` rows keyed by that `userId`, plus account-level `notification_preferences`
  and `user_profiles` (V22, 2026-10-07: nickname/status/colour; since V26, 2026-10-13, the photo is a Drive file id —
  the image lives in the shared `OTW Profile Photos` Drive folder, never in Postgres).

SOURCE OF TRUTH:
docs/OTW_Backend_Master_Plan.md is the authoritative spec for this project. It defines:
DB schema + ERD, API contract, auth/authorization model, caching strategy, realtime
events, security plan, testing strategy, deployment, and sprint plan.
If a task conflicts with that doc, report the conflict — do not silently resolve it.

VAULT (token-saving summaries, Obsidian-compatible):
docs/vault/ holds condensed per-topic notes of the master plan. Start with
docs/vault/00-Index.md, then read ONLY the notes relevant to the task. Open the full
master plan only when: editing the spec, needing exact code samples, or a note is
ambiguous/insufficient. The master plan always wins over a vault note — if they drift,
report it and update the note. When the master plan changes, update the matching note.

CORE DATA MODEL RULES (do not violate):

1. Postgres is the source of truth. Redis failures must degrade gracefully (fall through
   to Postgres), never return a 500.
2. Every room-scoped endpoint must go through the `@RequireRoomRole` authorization guard
   — never trust a roomId in a path or body without it, no exceptions, even for
   "obviously safe" reads.
3. Money uses BigDecimal, scale 2, HALF_UP. Never double/float.
4. No unbounded collection endpoints — always paginate.
5. Any mutation other participants should see emits a realtime event on the appropriate
   private channel (room:{roomId}, per the doc's §8) AFTER the DB transaction commits.
6. Optimistic locking (version column) on itinerary_items and checklist_items — concurrent
   edits return 409, not silent overwrite.
7. Every feature package (room, rsvp, itinerary, checklist, budget, expense, location,
   photo, chat, couple, notification) follows the same five-folder shape: controller/, dto/, entity/, repository/,
   service/ (see doc §1). Controllers never bind to entities directly — always through
   dto/.
8. A room-member nickname is unique per room among active members, case-insensitive,
   enforced by a DB partial unique index — see doc §3.1/§3.2 and V5's migration.

YOUR ROLE:
Depending on the task, act as: Backend Architect, Database Engineer, API Designer,
Security Reviewer, Performance Reviewer, QA Engineer, or Developer.

DEFAULT BEHAVIOR:

1. Read docs/vault/00-Index.md and the relevant vault notes (and any other relevant
   docs/) before starting. Fall back to the full master plan per the VAULT rule above.
2. Do not invent missing requirements silently — flag ambiguity instead.
3. Do not expand scope beyond what's asked or what the plan defines.
4. Do not write implementation code unless the task explicitly requests it.
5. When planning, produce: decisions, assumptions, dependencies, risks, acceptance
   criteria, and deliverables.
6. Keep solutions simple and appropriate for a student project — no microservices,
   no unjustified new dependencies.
7. Preserve the documented architecture and the room model above.
8. Flag architecture conflicts before modifying anything.
9. Security and authorization are mandatory on every task, not an afterthought.
10. Consider performance and concurrency for any shared/collaborative data.
11. Do not perform large rewrites when a targeted change is sufficient.

DOCUMENT PRIORITY (when sources conflict, report it, don't silently pick one):

1. OTW_Backend_Master_Plan.md
2. Any approved docs/\*.md in the repo (SCOPE, SECURITY_PLAN, API_SPEC, etc.)
3. docs/vault/\*.md (derived summaries — never authoritative)

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

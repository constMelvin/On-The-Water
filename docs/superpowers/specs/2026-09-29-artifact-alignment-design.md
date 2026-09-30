# OTW backend: align with the "G tayo? → OTW na." artifact

## Context
The artifact (claude.ai/artifact/HXzfneKKTSaxGEdjGSJKMZ) is the full product prototype. It has 22 screens and 10 user journeys. The backend (`otw-server/`) only covers the master-plan MVP: room create/join, RSVP, itinerary, checklist, budget, expenses/settlement, location and photos. The artifact goes further:
- **no-sign-up** play with an optional account
- Gala Code + **Gala Password** re-entry, with a "Which one are you?" picker
- a richer gala (date range, destination, lifecycle)
- Chat, Couple Mode, My Galas/History/Calendar, notifications, and "Mark paid" settlement

Your decisions: follow the artifact (anonymous first, account optional). Include Chat, the gala lifecycle with My Galas, Couple Mode, and notification prefs + Mark paid. Notifications = prefs + an in-app feed (no Web Push). Plan, then implement.

### ⚠ Conflicts flagged (per AGENTS.md: reported, not silently resolved)
1. **Auth reversal.** AGENTS.md and master plan §5.1 say anonymous sessions are rejected (`401 ACCOUNT_REQUIRED`), decided 2026-09-29 and marked "do not revisit". You have now told me to revisit it. Phase 0 amends AGENTS.md, master plan §5.1/§13 and vault `Auth.md` with a dated changelog entry before any code changes.
2. **Role matrix §5.3.** Budget PUT moves from host-only to host, or members when the "Edit the plan" permission is on. Itinerary **reorder** becomes a room-level action any member can do (today edits are owner/host only).
3. **Scope.** Chat, couple, notification and settlement-payment features and new tables are not in the master plan §3/§4. They are added to the plan doc in Phase 0.
4. §13 open item "partial/settled settlement" is resolved by recording payments (a computed view still, no running totals).

## Key design decisions
- **Anonymous → account keeps the same `sub`.** The frontend signs in with Supabase `signInAnonymously()`. "Create an Account" uses `updateUser`/`linkIdentity`, which converts the *same* user, so every membership carries over automatically. **Assumption:** the frontend uses linking, not a fresh sign-up.
- **Account-only features** (My Galas, history, calendar, notifications) use a new `@RequireAccount` annotation plus an aspect. It returns `401 ACCOUNT_REQUIRED` for tokens with `is_anonymous=true`. `NotAnonymousJwtValidator` is removed from the global decoder chain, and its detection logic moves into `CurrentUserProvider.isAnonymous()`.
- **Gala Password**: BCrypt hash in `rooms.password_hash` (spring-security-crypto is already on the classpath through Spring Security), required at creation, minimum 6 characters. It is never returned or logged.
- **Enter a Gala** (a new device or a cleared session gets a *new* anonymous `sub`):
  1. `POST /rooms/enter {code,password}` checks the credentials and returns the active members (`memberId`, nickname, role, `hasAccount`).
  2. `POST /rooms/enter/claim {code,password,memberId}` rebinds that member to the caller. It is **refused with `409 MEMBER_HAS_ACCOUNT`** if the member is linked to an account (they must log in instead), so accounts can't be hijacked.
  3. The claim remaps `user_id` in one transaction across every room-scoped user column (items `created_by`, `assigned_to`/`done_by`, `paid_by`, shares, payments, locations, photos, chat, reactions, read markers). This lives in a new `room/service/MemberIdentityRemapper`. It also evicts the old member cache key and emits `member.reclaimed`.
  4. Both steps are rate-limited per IP+code with the existing `ratelimit/RateLimiterService`.
- `room_members.has_account` is set from the JWT at create/join/claim. `POST /me/link-account` (called by the frontend after upgrading) flips it for all of the caller's rows.
- **Rejoin after leaving** reactivates the existing row instead of inserting. This fixes the `UNIQUE(room_id,user_id)` gap noted in V5 without schema surgery.
- **Phase is computed, not stored:** PLANNING before `start_date`, GALA_DAY between the dates, DONE after `end_date`, in timezone `otw.timezone=Asia/Manila`. `status` stays ACTIVE/ARCHIVED; ARCHIVED = "Mga Drawing"/shelved, and restore = "Revive it".
- **Archived rooms are read-only:** `RoomAccessAspect` rejects non-GET calls with `409 ROOM_ARCHIVED` unless the method is annotated with `allowArchived=true` (restore, delete, leave). Today archived rooms return 404 via `findActiveRoomOrThrow`; that changes to allow reads.
- **Member permission toggles** (settings screen) are booleans on `rooms`: `members_can_edit_plan`, `members_can_add_photos`, `members_can_delete_own_photos`, `location_sharing_enabled`. They are enforced in services via one helper, `room/service/RoomPermissionService`, and the error is `403 PERMISSION_DISABLED`. My interpretation of "Delete only their own photos": OFF means only the host deletes photos.
- **Couple Mode is a room type, not a new subsystem:** `room_type=COUPLE` (max 2 active members, `409 ROOM_FULL`). Places to Go = itinerary, Budget for Two = budget with `participant_count` fixed at 2, Our Photos = photos. Only saved date ideas are new.
- **Frontend-only (no backend work):** profile display name (Supabase `user_metadata`), sign out, "online now" (Supabase Realtime presence), ETA text, share sheet, quick-reply chips, room-code display formatting (the backend already issues 8-char codes; join/enter accept input with or without an `OTW-` prefix and dashes).

## Phases (each = migrations + DTOs + service + controller + tests; one realtime event per mutation, after commit)

### Phase 0: docs (before any code)
Amend `AGENTS.md` (auth model, the package list in rule 7 gets `chat`, `couple`, `notification`). Update `docs/OTW_Backend_Master_Plan.md` §3/§4/§5.1/§5.3/§8/§13 with a changelog entry, and vault `Auth`, `Schema`, `API`, `Realtime`, `Structure`, `Sprints`. Save this plan as `docs/superpowers/specs/2026-09-29-artifact-alignment-design.md`.

### Phase 1: auth model
- `config/SecurityConfig.java`: drop `NotAnonymousJwtValidator` from the decoder chain and keep the ACCOUNT_REQUIRED entry-point mapping.
- New `security/auth/RequireAccount` + `AccountRequiredAspect`. `CurrentUserProvider` gets `isAnonymous()`.
- Tests: rewrite `NotAnonymousJwtValidatorTest` into an aspect test. `SecurityFilterTest`: an anonymous token reaches room endpoints and gets 401 ACCOUNT_REQUIRED on `/me/*`.

### Phase 2: gala details + lifecycle (`room` package)
- **V6__Add_Gala_Details_And_Password.sql** on `rooms`:
  - adds `destination VARCHAR(150)`, `start_date DATE`, `end_date DATE`, `start_time TIME`, `end_time TIME`, `password_hash VARCHAR(100)`
  - backfills `start_date`/`end_date` from `schedule_at`, which is kept and still written as start date+time for compatibility
- **V7__Add_Room_Type_And_Permissions.sql**: `room_type VARCHAR(10) DEFAULT 'GROUP'` + the 4 permission booleans (default true).
- **V8__Add_Member_Account_And_Travel_Status.sql**: `room_members.has_account BOOLEAN DEFAULT false`, `travel_status VARCHAR(20) DEFAULT 'STILL_HOME'`.
- Endpoints (all under `/api/v1`):
  | Method | Path | Guard |
  |---|---|---|
  | POST | `/rooms` (title, startDate, endDate?, startTime?, endTime?, destination, password, type, nickname) | auth (anon ok), rate-limited |
  | GET | `/rooms/preview?code=` → title, dates, destination, type, memberCount, ≤12 nicknames, full? | auth, rate-limited |
  | POST | `/rooms/join` (existing; + reactivation, couple cap, has_account) | auth |
  | POST | `/rooms/enter`, `/rooms/enter/claim` | auth, rate-limited |
  | GET | `/rooms/{id}` (+ phase, dates, destination, type, permissions, myRole) | MEMBER |
  | PATCH | `/rooms/{id}` details + permissions | HOST |
  | PUT | `/rooms/{id}/password` | HOST |
  | POST | `/rooms/{id}/code` (regenerate, reuses `CodeGenerator`) | HOST |
  | POST | `/rooms/{id}/archive`, `/rooms/{id}/restore` | HOST (allowArchived) |
  | DELETE | `/rooms/{id}` (cascade; Drive files are left alone, since the backend's Drive access is read-only) | HOST (allowArchived) |
  | POST | `/rooms/{id}/members/me/leave` (host → `409 HOST_CANNOT_LEAVE`) | MEMBER (allowArchived) |
  | PATCH | `/rooms/{id}/members/me` (nickname; same uniqueness rules as V5) | MEMBER |
  | PUT | `/rooms/{id}/members/me/travel-status` (STILL_HOME/ON_THE_WAY/ALMOST_THERE/ARRIVED) | MEMBER |
  | POST | `/rooms/{id}/members/{userId}/nudge` (target must be MAYBE) | HOST |
  | GET | `/rooms/{id}/summary`: dashboard + recap counts (rsvp, stops, packed/total, budget total/per-person, spent, settled?, READY photos, travel-status counts, my unread chat) | MEMBER |
- Events: `room.updated`, `room.archived`, `room.restored`, `room.deleted`, `room.code.changed`, `member.reclaimed`, `member.updated`, `member.travel.changed`, `member.nudged`.

### Phase 3: account area (`room` package, `MeController`)
`GET /me/rooms?view=ongoing|upcoming|completed|archived&cursor&limit` and `GET /me/rooms?from=&to=` (calendar range), both paged. `GET /me/rooms/stats` (completed, people, archived counts). `POST /me/link-account`. All use `@RequireAccount`. They rely on the existing `room_members(user_id)` index.

### Phase 4: feature upgrades
- **Itinerary.** **V9** `stop_type VARCHAR(20) DEFAULT 'ACTIVITY'` (MEET_UP/ACTIVITY/FOOD); `title` = place. New `POST /itinerary/reorder {items:[{id,version}]}`:
  - takes the full ordered list and requires the edit-plan permission
  - any stale version or a list/room mismatch → 409
  - rewrites positions 0..n-1 in one transaction and emits `itinerary.reordered`
  - adding a stop posts a CARD chat message (Phase 5)
- **Checklist.** `POST /checklist/{id}/claim {version}` → `409 ALREADY_CLAIMED` if assigned. `GET ?filter=all|mine|done` (add if missing). Enforce the edit-plan permission.
- **Budget.** **V10** adds `transport/stay/food/activities/other_amount NUMERIC(12,2) DEFAULT 0` and `participant_count INT DEFAULT 1 CHECK ≥1`. `estimated_amount` = sum, written by the service. The DTO returns categories, total, and perPerson (BigDecimal scale 2 HALF_UP). PUT is allowed for HOST, or a MEMBER when the edit-plan permission is on. **Add the missing `budget.updated` event** and a notification.
- **Expenses + Mark paid.** **V11**:
  - adds `expenses.category VARCHAR(20) DEFAULT 'OTHER'` and `note VARCHAR(255)`
  - adds `settlement_payments(id, room_id FK CASCADE, from_user_id, to_user_id, amount NUMERIC(12,2) CHECK>0, recorded_by, created_at)` plus RLS
  - when shares are omitted, POST splits equally among GOING members (falling back to all active members), with remainder cents assigned deterministically so the sum equals the amount
  - settlement net per member = expenses paid − shares + payments sent − payments received; greedy transfers as today
  - `GET /expenses/settlement` → `{totalSpent, myShare, myPaid, myNet, transfers[], payments[] (≤200)}`
  - `POST /expenses/settlement/payments {fromUserId,toUserId,amount}` requires the caller to be from, to or host, and the amount must be ≤ the current transfer for that pair, otherwise `409 SETTLEMENT_MISMATCH`
  - `DELETE /expenses/settlement/payments/{id}` (recorder or host)
  - events `settlement.payment.recorded`/`deleted`; the settlement cache key is evicted on every payment and expense write
- **Location.** Cap `expires_at` at gala end (end_date + end_time, or 23:59 Manila) + 3h. Honour `location_sharing_enabled`. Travel status is in Phase 2.
- **Photos.** **V12** adds `photos.caption VARCHAR(140)`. `GET ?uploadedBy=me`. Enforce add/delete permissions. Delete = host, or the uploader when members_can_delete_own_photos is on.

### Phase 5: Chat (new `chat` package, five-folder shape)
- **V13__Add_Chat.sql** + RLS:
  - `chat_messages(id, room_id FK CASCADE, sender_user_id NULL, kind TEXT|SYSTEM|CARD, body VARCHAR(1000), ref_type, ref_id, created_at)` with index `(room_id, created_at DESC, id)`
  - `chat_reactions(message_id FK CASCADE, user_id, created_at, PK(message_id,user_id))`, heart only
  - `chat_read_markers(room_id, user_id, last_read_at, PK)`
- Endpoints (all MEMBER):
  - `GET /rooms/{id}/chat/messages?cursor&limit≤50` returns heartCount and reactedByMe
  - `POST /rooms/{id}/chat/messages`, rate-limited to 20/min/user
  - `PUT` and `DELETE /rooms/{id}/chat/messages/{msgId}/heart`
  - `PUT /rooms/{id}/chat/read`
  - unread count is exposed in the summary plus `GET /chat/unread` → `{count, firstUnreadId}`
- `ChatSystemMessageService` is called inside the originating transaction for: member joined, RSVP changed, stop added (CARD referencing the itinerary item), expense added. Events `chat.message.created` and `chat.reaction.changed`.

### Phase 6: Couple Mode (new `couple` package)
**V14** `couple_saved_ideas(room_id FK CASCADE, idea_key VARCHAR(40), saved_by, created_at, PK(room_id, idea_key))` + RLS. A server-side `CoupleIdea` enum holds the 6 artifact ideas (title, cost, duration). `GET /rooms/{id}/couple/ideas` returns the catalog plus saved flags. `PUT` and `DELETE /rooms/{id}/couple/ideas/{key}` save and unsave. A non-couple room → `404 NOT_A_COUPLE_ROOM`. Event `couple.idea.changed`.

### Phase 7: Notifications (new `notification` package)
- **V15** `notification_preferences(user_id PK, soon, joined, attendance, checklist, budget, day_before, gala_day BOOLEAN, updated_at)`. Defaults match the artifact: soon/joined/checklist/day_before/gala_day on, attendance/budget off.
- **V15** also adds `notifications(id, user_id, room_id FK CASCADE NULL, type, title, body, dedupe_key, created_at, read_at)` with UNIQUE(user_id, dedupe_key) and an index `(user_id, created_at DESC)`.
- Endpoints (all `@RequireAccount`): `GET` and `PUT /me/notification-preferences`, `GET /me/notifications?cursor`, `PATCH /me/notifications/{id}/read`, `POST /me/notifications/read-all`.
- Producers: services publish Spring events, and a `@TransactionalEventListener(AFTER_COMMIT)` with `REQUIRES_NEW` inserts rows for active members who have `has_account=true` and the preference on, excluding the actor. A failure is logged only and never fails the request.
- An hourly `@Scheduled` job (scheduling is already enabled in `OtwServerApplication`) creates SOON (3 days before), DAY_BEFORE, GALA_DAY and the checklist reminder (day before, the member has undone assigned items). The dedupe key prevents repeats.
- The frontend polls the feed (no user realtime channel, which keeps §8 unchanged).

## Cross-cutting
- Every new room-scoped endpoint uses `@RequireRoomRole`, and every DTO has Bean Validation.
- Money is BigDecimal scale 2 HALF_UP, and every list is cursor-paged.
- Every new table gets RLS (the V3 pattern), in the same migration.
- Redis stays cache-aside only. New keys go in `cache/CacheKeys.java` with evictAfterCommit on writes, and a Redis failure falls through to Postgres.
- Error codes are added to `common/DomainExceptions` and the global handler: `INVALID_GALA_PASSWORD`, `MEMBER_HAS_ACCOUNT`, `ROOM_FULL`, `ROOM_ARCHIVED`, `HOST_CANNOT_LEAVE`, `ALREADY_CLAIMED`, `PERMISSION_DISABLED`, `SETTLEMENT_MISMATCH`, `NOT_A_COUPLE_ROOM`.
- Reuse the existing `publishAfterCommit` pattern, `PageResponse`, `CodeGenerator`, `RateLimiterService` and `CacheService`.

## Risks
- **Anonymous abuse** (throwaway accounts spamming room creation or chat). Mitigations: rate limits on create/join/enter/chat, and enabling Supabase CAPTCHA for anonymous sign-ins (Supabase dashboard setting, needed from you).
- **Code+password = impersonation of any *anonymous* member.** Accepted by the artifact design ("the picker prevents two people acting as one"). Account-linked members are protected.
- **The identity remap touches many tables.** Every user-id column is listed in one place (`MemberIdentityRemapper`), and each has a test. The Structure vault note gets a rule: any new user column must be added there.
- **Room deletion leaves the Drive files.** Documented; a cleanup job is out of scope.
- **Large change set.** Phases are independent after Phases 1–2, so each can be reviewed separately. Per your preference I won't commit; you review and commit each phase.

## Verification
- `cd otw-server && ./mvnw.cmd test` after each phase. This runs the unit tests plus Testcontainers (Docker needs to be running).
- New tests follow the existing patterns (`*ServiceTest` with mocks, `RoomMemberRepositoryTest`-style `@DataJpaTest`):
  - anonymous token → room endpoints OK, `/me/*` → ACCOUNT_REQUIRED
  - enter/claim happy path, wrong password, and a claim of an account member → 409; the remap moves ownership of items, expenses and chat
  - rejoin after leave
  - archived room: writes → 409, reads OK
  - permission toggles → 403
  - reorder with a stale version → 409
  - budget per-person rounding
  - settlement with payments, including uneven splits and partial payments
  - chat paging + unread count
  - couple cap → ROOM_FULL
  - notification prefs filtering + scheduler dedupe
  - all Flyway migrations apply cleanly on the Testcontainers Postgres
- Manual smoke test: `./mvnw.cmd spring-boot:run`, then walk the artifact's 10 journeys with curl/HTTP-client calls using an anonymous Supabase token and a linked account token.

## As built (2026-09-29) — where the implementation differs from the plan above
- **Order:** docs (Phase 0) were updated last, after the code, so they describe what actually shipped. The conflicts above were recorded in this spec before any code changed.
- **Entry point:** the `ACCOUNT_REQUIRED` mapping in `SecurityConfig` was removed rather than kept — anonymous tokens now verify successfully, so `ACCOUNT_REQUIRED` only comes from `AccountRequiredAspect` (via `DomainExceptions.AccountRequiredException`). `NotAnonymousJwtValidator` and its test were deleted.
- **Tests:** `SecurityFilterTest` was not extended (the `@WebMvcTest` slice can't mint a validly signed JWT); anonymous vs account behaviour is covered by `AccountRequiredAspectTest`. 140 unit tests pass; the 3 Testcontainers tests (incl. Flyway V6–V15 on real Postgres and Hibernate `ddl-auto=validate`) were **skipped — Docker isn't available on the dev machine**.
- **Additions not spelled out above:** `POST /expenses` takes an optional `paidBy` (the artifact's "Paid by" picker); a `NUDGE` notification type (not a user toggle); leaving a gala deletes the member's location row; `GET /me/notifications/unread-count`; photo listing switched from an id cursor to a `(created_at, id)` keyset so newest-first paging is correct; `MethodArgumentTypeMismatchException`/missing query params now map to `400 VALIDATION_ERROR` instead of 500.
- **Checklist permission detail:** ticking done/undone and claiming are always allowed; renaming/reassigning/adding/deleting follow "Edit the plan".
- **Budget default people count:** members who said GOING (min 1); always 2 in Couple Mode.

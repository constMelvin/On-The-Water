---
source: master plan §3
---

# Database Schema

Back to [[00-Index]] · Full DDL: master plan §3.1 and §3.1.1

## Model
Every **Room** (a one-off gala or trip) is standalone — there is no persistent group/barkada tier. `room_members` is the only membership table.

> Group/barkada tier removed 2026-09-29 — see docs/OTW - WEB.pdf's flat Room-only model. This drift from the original master plan §3 is intentional; the master plan itself is being amended in the same change.
>
> V6–V15 (2026-09-29, artifact alignment) added gala details, Gala Password, Couple Mode, permissions, travel status, budget categories, payments, chat, couple ideas and notifications.

## Tables
All `id` columns are `UUID DEFAULT gen_random_uuid()`. All timestamps are `TIMESTAMPTZ`.

| Table | Key columns | Notes |
|---|---|---|
| `rooms` | room_code VARCHAR(8) UNIQUE, title(120), destination(150), destination_lat/lng (V19, nullable map pin), start_date/end_date DATE, start_time/end_time TIME, schedule_at (kept = start date+time), meeting_lat/lng/label, password_hash(100, BCrypt), host_user_id, status (ACTIVE/ARCHIVED), room_type (GROUP/COUPLE), members_can_edit_plan / members_can_add_photos / members_can_delete_own_photos / location_sharing_enabled BOOLEAN | Phase (PLANNING/GALA_DAY/DONE) is computed from dates in `otw.timezone`, never stored |
| `room_members` | room_id FK CASCADE, user_id (= auth.users.id), nickname(60), role (HOST/MEMBER), rsvp_status (GOING/MAYBE/NOT_GOING/PENDING), has_account BOOL, travel_status (STILL_HOME/ON_THE_WAY/ALMOST_THERE/ARRIVED), joined_at, left_at | UNIQUE(room_id, user_id) — rejoining reactivates the old row; nickname unique per room (case-insensitive, active only) |
| `itinerary_items` | room_id FK CASCADE, title(150) = place, notes TEXT, starts_at, stop_type (MEET_UP/ACTIVITY/FOOD), lat/lng DOUBLE nullable (V23 pin, both or neither), position INT, created_by, completed BOOL, **version INT** | Optimistic locking; reorder rewrites positions 0..n-1 |
| `checklist_items` | room_id FK CASCADE, label(150), assigned_to (nullable), is_done, done_by, done_at, **version INT**, created_at | Optimistic locking |
| `budget_estimates` | **room_id PK** FK CASCADE, transport/stay/food/activities/other_amount NUMERIC(12,2), participant_count INT ≥1, estimated_amount (= sum), currency(3) default PHP, updated_by, updated_at | One per room; per-person computed on read |
| `expenses` | room_id FK CASCADE, description(150), amount NUMERIC(12,2) CHECK > 0, paid_by, category (FOOD/TRANSPORTATION/STAY/ACTIVITIES/OTHER), note(255), created_at | |
| `expense_shares` | expense_id FK CASCADE, user_id, share_amount NUMERIC(12,2) CHECK >= 0 | UNIQUE(expense_id, user_id) |
| `settlement_payments` | room_id FK CASCADE, from_user_id, to_user_id, amount > 0, recorded_by, created_at | "Mark paid"; insert/delete only |
| `member_locations` | PK(room_id, user_id), lat, lng, share_mode (PIN/LIVE), expires_at, updated_at | Current row only, no history. See [[Location]] |
| `photos` | room_id FK CASCADE, drive_file_id(200), uploaded_by, caption(140), status (PENDING/READY/FAILED), created_at | Metadata only; binaries stay in Google Drive |
| `chat_messages` | room_id FK CASCADE, sender_user_id (NULL for SYSTEM), kind (TEXT/SYSTEM/CARD), body(1000), ref_type (ITINERARY_ITEM/EXPENSE for CARD; PHOTO for a TEXT message with a Dump photo), ref_id, created_at | Insert-only |
| `chat_reactions` | PK(message_id, user_id), reaction (V21: HEART/HAHA/WOW/SAD/ANGRY/LIKE, default HEART), created_at | One per member; a new pick replaces it |
| `chat_read_markers` | PK(room_id, user_id), last_read_at | Unread badge + "new" divider |
| `couple_saved_ideas` | PK(room_id, idea_key), saved_by, created_at | Catalog is the `CoupleIdea` enum |
| `award_polls` · `award_votes` | V25 (2026-10-11, Barkada Awards): one poll per gala (`room_id` PK, `closes_at`, `closed_at`); vote PK (room_id, category_key, voter_user_id) = one vote per member per category, `CHECK voter <> nominee`; no SELECT policy (anonymous votes). Categories are an enum in code; results are computed on read | Needs V24 applied first (ordering only) |
| `couple_home_locations` · `couple_bucket_items` · `couple_quiz_sessions` · `couple_quiz_answers` | V24 (2026-10-11): every row scoped by `room_id` (ON DELETE CASCADE); bucket items have `version` + optional `photo_id` memory | Couple features: Halfway Checker, Our Little Bucket List, Who Knows Who Better? (all three live) |
| `notification_preferences` | user_id PK, 7 BOOLEAN toggles, updated_at | Missing row = defaults |
| `user_profiles` | user_id PK, nickname(20), status(40), color NULL (rosy/teal/zest/blossom), photo TEXT NULL (data URL ≤65k), updated_at | V22 (2026-10-07). Keyed by JWT `sub`, no FK to `auth.users`; missing row = empty profile. Only table holding image bytes (capped) |
| `notifications` | user_id, room_id FK CASCADE NULL, type, title(120), body(300), dedupe_key, created_at, read_at | UNIQUE(user_id, dedupe_key) makes the scheduler idempotent |

There is no `users` table (the account-level `user_profiles` and `notification_preferences` are keyed by the same `sub`, not an identity table). Identity comes from Supabase `auth.users`, and `user_id` is taken from the JWT `sub` claim.

(`MemberIdentityRemapper` was removed with Enter a Gala on 2026-10-07.) See [[Auth]].

## Indexes (§3.2)
- `rooms(room_code)`: unique; used by join
- `rooms(status, start_date)`: My Galas + reminder scheduler
- `room_members(room_id,user_id)`: unique; used by every authorization check
- `room_members(room_id, LOWER(nickname)) WHERE left_at IS NULL`: unique, partial; enforces per-room nickname uniqueness among active members (case-insensitive; a nickname frees up when its holder leaves)
- `room_members(user_id)`: for "my rooms" queries
- `itinerary_items(room_id,position)`, `checklist_items(room_id,is_done)`
- `expenses(room_id)`, `expense_shares(expense_id)`, `member_locations(room_id)` (with cleanup of expired rows via `expires_at`)
- `chat_messages(room_id, created_at DESC, id DESC)`, `notifications(user_id, created_at DESC, id DESC)`, `settlement_payments(room_id, created_at DESC)`, `photos(room_id, created_at DESC)`

## Concurrency (§3.3)
- `@Version` on itinerary and checklist items. A stale version returns **409 CONFLICT** and the client refetches. Reorder and claim also take versions.
- Expenses and payments are insert-only, so they need no locking. Settlement is **computed on read** (net = paid − shares + payments sent − payments received) and never stored as a running total.

## Flyway (§3.4)
- Migrations are additive (no `DROP COLUMN` early on), with one feature per file (V6 gala details … V15 notifications; V16 RLS on `realtime.messages` for private room channels, Supabase only; V17 `rooms.is_listed`, now unused: the directory lists every active gala; V18 `rooms.drive_folder_id` (per-gala Drive folder) + `photos.mime_type`; V19 `rooms.destination_lat/lng`).
- Never edit a migration that has already run in a shared environment. Add a new one instead.

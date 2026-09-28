---
source: master plan §3
---

# Database Schema

Back to [[00-Index]] · Full DDL: master plan §3.1

## Model
A **Group** (persistent barkada, joined via `group_code`) contains many **Rooms** (one-off galas).
A Room can be standalone (`group_id = NULL`). `group_members` and `room_members` are **separate tables**: being in a group never enrolls you in a room. Creating a room in a group pre-fills invites from the roster, but each person still needs their own `room_members` row.

## Tables
All `id` columns are `UUID DEFAULT gen_random_uuid()`. All timestamps are `TIMESTAMPTZ`.

| Table | Key columns | Notes |
|---|---|---|
| `groups` | group_code VARCHAR(8) UNIQUE, name(120), created_by, status (default ACTIVE), created_at, updated_at | |
| `group_members` | group_id FK→groups CASCADE, user_id, nickname(60), role (OWNER/ADMIN/MEMBER, default MEMBER), joined_at, left_at | UNIQUE(group_id, user_id) |
| `rooms` | group_id FK→groups **SET NULL** (nullable), room_code VARCHAR(8) UNIQUE, title(120), schedule_at, meeting_lat/lng DOUBLE, meeting_label(255), host_user_id, status (ACTIVE/ARCHIVED) | |
| `room_members` | room_id FK CASCADE, user_id (= auth.users.id), nickname(60), role (HOST/MEMBER), rsvp_status (GOING/MAYBE/NOT_GOING/PENDING, default PENDING), joined_at, left_at | UNIQUE(room_id, user_id) |
| `itinerary_items` | room_id FK CASCADE, title(150), notes TEXT, starts_at, position INT, created_by, completed BOOL, **version INT** | Optimistic locking |
| `checklist_items` | room_id FK CASCADE, label(150), assigned_to (nullable), is_done, done_by, done_at, **version INT**, created_at | Optimistic locking |
| `budget_estimates` | **room_id PK** FK CASCADE, estimated_amount NUMERIC(12,2) default 0, currency(3) default PHP, updated_by, updated_at | One per room |
| `expenses` | room_id FK CASCADE, description(150), amount NUMERIC(12,2) CHECK > 0, paid_by, created_at | |
| `expense_shares` | expense_id FK CASCADE, user_id, share_amount NUMERIC(12,2) CHECK >= 0 | UNIQUE(expense_id, user_id) |
| `member_locations` | PK(room_id, user_id), lat, lng, share_mode (PIN/LIVE), expires_at, updated_at | Current row only, no history. See [[Location]] |
| `photos` | room_id FK CASCADE, drive_file_id(200), uploaded_by, status (PENDING/READY/FAILED), created_at | Metadata only; binaries stay in Google Drive |

There is no `users` table. Identity comes from Supabase `auth.users`, and `user_id` is taken from the JWT `sub` claim.

## Indexes (§3.2)
- `groups(group_code)` and `rooms(room_code)`: unique; used by join
- `group_members(group_id,user_id)` and `room_members(room_id,user_id)`: unique; used by every authorization check
- `group_members(user_id)` and `room_members(user_id)`: for "my groups/rooms" queries
- `rooms(group_id)`, `itinerary_items(room_id,position)`, `checklist_items(room_id,is_done)`
- `expenses(room_id)`, `expense_shares(expense_id)`, `member_locations(room_id)` (with cleanup of expired rows via `expires_at`)

## Concurrency (§3.3)
- `@Version` on itinerary and checklist items. A stale version returns **409 CONFLICT** and the client refetches.
- Expenses are insert-only, so they need no locking. Settlement is **computed on read** and never stored as a running total.

## Flyway (§3.4)
- Migrations are additive (no `DROP COLUMN` early on), with one feature per file (e.g. `V3__add_checklist_items.sql`).
- Never edit a migration that has already run in a shared environment. Add a new one instead.

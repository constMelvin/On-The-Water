---
source: master plan §5
---

# Authentication & Authorization

Back to [[00-Index]] · Full `SecurityConfig` code: master plan §5.1.1

## Authentication (§5.1). Already decided; do not revisit.
- The frontend talks to Supabase Auth directly. The backend **never** issues, stores, or refreshes tokens. It only verifies them.
- Verification uses the Spring **OAuth2 Resource Server** (`spring-boot-starter-oauth2-resource-server` + `-security`).
  - `jwk-set-uri: ${SUPABASE_URL}/auth/v1/.well-known/jwks.json` handles key fetching, caching, and rotation.
  - `issuer-uri: ${SUPABASE_URL}/auth/v1`
  - `supabase.jwt-audience: ${SUPABASE_JWT_AUD:authenticated}`
- The `NimbusJwtDecoder` validates signature, `exp`, `iat`, `iss`, and adds an explicit `aud` check.
- The filter chain is stateless with CSRF disabled. `/actuator/health` is permitAll; everything else requires authentication.
- 401 returns `{"code":"UNAUTHENTICATED",...}`; 403 returns `{"code":"FORBIDDEN",...}`.
- The converter sets the principal name to `sub`. Read it through `CurrentUserProvider.getUserId()` rather than calling `SecurityContextHolder` everywhere.

### Anonymous-first (revised 2026-09-29 to match the product artifact)
- Anonymous Supabase sessions are **accepted** for everything inside a gala. No sign-up is needed to plan, join or use room features.
- Account-only endpoints (everything under `/me/`: My Galas, calendar, history, notifications) carry `@RequireAccount`. `AccountRequiredAspect` returns `401 {"code":"ACCOUNT_REQUIRED"}` when `CurrentUserProvider.isAnonymous()` is true (`is_anonymous` claim, or no email — fail-closed).
- "Save this gala": the frontend upgrades the anonymous user with `updateUser`/`linkIdentity` (same `sub`), then calls `POST /me/link-account` → `room_members.has_account = true` everywhere.
- **Enter a Gala**: `POST /rooms/enter` (Gala Code + BCrypt Gala Password) lists members; `POST /rooms/enter/claim` rebinds an anonymous member row to the new session and `MemberIdentityRemapper` moves all room-scoped user-id columns in the same transaction. `has_account` members can't be claimed (`409 MEMBER_HAS_ACCOUNT`). Rate-limited per client.

## Authorization: one tier (§5.2)
**Room-scoped endpoints**, cheapest check first:
1. JWT valid? The filter handles this.
2. Room exists? If not, **404**. Return the same 404 for "doesn't exist" and "exists but you can't see it", so room codes can't be enumerated.
3. Does the user have a `room_members` row? Check cache first. If not, **403**.
4. Does the action need HOST? Check the role.
5. Archived gala + non-GET endpoint? **409 ROOM_ARCHIVED**, unless the endpoint sets `allowArchived = true` (restore, delete, leave, mark chat read). Status is read fresh, never cached.

Implementation:
- Method-level `@RequireRoomRole(RoomRole.X, allowArchived = false)`.
- One AOP aspect, `RoomAccessAspect`, reads the `roomId` path variable.
- **Every** room-scoped endpoint uses the guard. Never trust an ID from the path or body without one.
- Member permission toggles ("What members can do") are enforced in services via `RoomPermissionService` → `403 PERMISSION_DISABLED`. They never restrict the host.

## Role matrix (§5.3)
**Room:**

| Action | HOST | MEMBER |
|---|---|---|
| Create room (creator becomes host), join, RSVP/nickname/travel status own, add expense, chat | ✅ | ✅ |
| Edit room details/permissions/password/code, archive/restore/delete, remove member, nudge | ✅ | ❌ |
| Leave gala | ❌ (archive/delete) | ✅ |
| Add itinerary/checklist, reorder route, set budget | ✅ | ✅ while "Edit the plan" is on |
| Edit or delete itinerary/checklist item | ✅ | own items only, while "Edit the plan" is on |
| Tick checklist done, claim | ✅ | ✅ |
| Delete expense | ✅ | payer only |
| Mark paid / undo | ✅ | the two people involved / the recorder |
| Add photo · delete photo | ✅ · any | while "Add photos" is on · own only, while "Delete only their own photos" is on |
| Share location | ✅ | ✅ (opt-in) while "Share live location" is on |
| View another room's data | ❌ | ❌ |

## RLS (§5.4)
RLS policies on **every** table must independently enforce room membership as defense in depth, in case anything ever queries Supabase directly. Per-user tables (`chat_read_markers`, `notification_preferences`, `notifications`) use `user_id = auth.uid()`.

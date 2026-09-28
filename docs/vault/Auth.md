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
- 401 returns `{"code":"UNAUTHENTICATED",...}`. 403 returns `{"code":"FORBIDDEN",...}`.
- The converter sets the principal name to `sub`. Read it through `CurrentUserProvider.getUserId()` rather than calling `SecurityContextHolder` everywhere.
- Anonymous Supabase users are real users with a real `sub`; treat them the same as email users. Known limitation: they lose their identity if they clear browser storage.

## Authorization: two independent tiers (§5.2)
**Room-scoped endpoints**, cheapest check first:
1. JWT valid? The filter handles this.
2. Room exists? If not, **404**. Return the same 404 for "doesn't exist" and "exists but you can't see it", so room codes can't be enumerated.
3. Does the user have a `room_members` row? Check cache first. If not, **403**. **Never substitute group membership for this check.**
4. Does the action need HOST? Check the role.

**Group-scoped endpoints** follow the same steps: JWT → group exists (404) → `group_members` row (403) → OWNER/ADMIN if the action needs it.

Implementation:
- Method-level `@RequireRoomRole(RoomRole.X)` and `@RequireGroupRole(GroupRole.X)`.
- Two AOP aspects, `RoomAccessGuard` and `GroupAccessGuard`. Each reads its own path variable (`roomId` / `groupId`).
- **Every** room- or group-scoped endpoint uses a guard. Never trust an ID from the path or body without one.

## Role matrices (§5.3)
**Group:** Any authenticated user can create a group and becomes its OWNER. All members can join, view the roster and list galas, and create galas. OWNER/ADMIN can remove members and edit settings. Only the OWNER can delete or archive the group.

**Room** (same rules whether standalone or in a group):

| Action | HOST | MEMBER |
|---|---|---|
| Create room (creator becomes host), join, RSVP own, add itinerary/checklist, add expense | ✅ | ✅ |
| Edit room details, remove member | ✅ | ❌ |
| Edit or delete itinerary/checklist item | ✅ | own items only |
| Delete expense | ✅ | payer only |
| Share location | ✅ | ✅ (opt-in) |
| View another room's data | ❌ | ❌ |

**Group OWNER/ADMIN gets no elevated rights inside a room they don't host.** Allowing that would open a privilege-escalation path.

## RLS (§5.4)
RLS policies on **every** table must independently enforce room membership as defense in depth, in case anything ever queries Supabase directly.

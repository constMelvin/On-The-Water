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
- Anonymous Supabase sessions are rejected. NotAnonymousJwtValidator fails any token with is_anonymous=true or a blank email → 401 {"code":"ACCOUNT_REQUIRED"}. Every non-public endpoint requires a registered account.

## Authorization: one tier (§5.2)
**Room-scoped endpoints**, cheapest check first:
1. JWT valid? The filter handles this.
2. Room exists? If not, **404**. Return the same 404 for "doesn't exist" and "exists but you can't see it", so room codes can't be enumerated.
3. Does the user have a `room_members` row? Check cache first. If not, **403**.
4. Does the action need HOST? Check the role.

Implementation:
- Method-level `@RequireRoomRole(RoomRole.X)`.
- One AOP aspect, `RoomAccessGuard`, reads the `roomId` path variable.
- **Every** room-scoped endpoint uses the guard. Never trust an ID from the path or body without one.

## Role matrix (§5.3)
**Room:**

| Action | HOST | MEMBER |
|---|---|---|
| Create room (creator becomes host), join, RSVP own, add itinerary/checklist, add expense | ✅ | ✅ |
| Edit room details, remove member | ✅ | ❌ |
| Edit or delete itinerary/checklist item | ✅ | own items only |
| Delete expense | ✅ | payer only |
| Share location | ✅ | ✅ (opt-in) |
| View another room's data | ❌ | ❌ |

## RLS (§5.4)
RLS policies on **every** table must independently enforce room membership as defense in depth, in case anything ever queries Supabase directly.

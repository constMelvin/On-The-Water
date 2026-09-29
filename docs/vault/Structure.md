---
source: master plan §0, §1
---

# Structure & Guiding Rules

Back to [[00-Index]]

## Guiding rules (§0)
1. Postgres (Supabase) is the source of truth. Redis is disposable; if it's down, responses get slower but must not fail.
2. Every room endpoint checks **room membership + role**, even with a valid JWT. See [[Auth]].
3. Money: `BigDecimal`, scale 2, `HALF_UP`. Never `double`/`float`.
4. No unbounded collections; everything is paginated.
5. Mutations others should see emit a realtime event. See [[Realtime]].
6. One Spring Boot modular monolith, package-by-feature. No microservices.

## Packages (§1)
Root `com.gala.otw_server`:
- `config/`: SecurityConfig, RedisConfig, CacheConfig, CorsConfig, WebSocketConfig, RateLimitConfig
- `common/`: BaseException, ApiResponse, ErrorCode, AuditFields, PageResponse
- `security/jwt/`: Supabase JWT verification
- `security/authz/`: `@RequireRoomRole` + aspect
- **Feature packages**: `room`, `rsvp`, `itinerary`, `checklist`, `budget`, `expense`, `location`, `photo`
- **Cross-cutting (no controller, no five-folder split)**: `realtime/` (RealtimeEventPublisher), `cache/` (CacheKeys, CacheEvictionService), `ratelimit/`
- Resources: `application.yml`, `application-local.yml`, `application-prod.yml`, `db/migration/`
- Tests mirror the main packages under `src/test/java/com/gala/otw_server/`

## Five-folder shape (every feature package)
| Folder | Responsibility |
|---|---|
| `controller/` | REST only; no business logic; never calls repositories directly |
| `dto/` | Request/response objects; controllers bind only to these (prevents mass assignment) |
| `entity/` | JPA entities for [[Schema]] tables |
| `repository/` | Spring Data JPA, one per entity |
| `service/` | Business logic, `@Transactional`, extra authorization checks, and triggering realtime events and cache evictions after writes |

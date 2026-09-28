---
source: master plan §10, §11
---

# Testing & Deployment

Back to [[00-Index]]

## Testing (§10)
| Level | Tooling | Focus |
|---|---|---|
| Unit | JUnit 5 + Mockito | Settlement math, validation, mapping |
| Integration | `@SpringBootTest` + Testcontainers Postgres | Repository queries, clean Flyway runs |
| API | RestAssured / MockMvc | Auth rejection, role checks, pagination, error shape |
| Concurrency | JUnit + `ExecutorService` | Optimistic-lock 409 on itinerary/checklist |
| Security | Endpoint sweep | Every room endpoint rejects a non-member's valid JWT |
| Load | k6 / Gatling | 10/25/50/100/200 users; p95/p99, error rate, Redis hit rate, pool saturation |
| Cache failure | Stop Redis mid-test | No 500s; responses served from Postgres |

Targets: **P95 < 500 ms, P99 < 1.5 s, error rate < 1%**.

## Deployment (§11)
- **Environments**: local (docker-compose with Postgres and Redis), staging, and production (Spring Boot on Render; DB/Auth/Realtime on managed Supabase).
- **Env vars** (never committed): `SUPABASE_URL`, `SUPABASE_JWT_AUD`, `SUPABASE_JWKS_URL`, `SPRING_DATASOURCE_URL/USERNAME/PASSWORD`, `REDIS_URL`, `GOOGLE_DRIVE_*`.
- **CORS**: the Vercel frontend URL(s) plus localhost.
- **CI** (every PR): unit and integration tests, and Flyway against a throwaway Testcontainers DB. Any migration error fails the build.
- **Pre-release checklist**:
  - Flyway runs clean on a fresh DB.
  - No secrets in the repo.
  - CORS is locked down.
  - Rate limits are on.
  - Redis fallback is verified.
  - Load test results are documented.
  - Actuator health doesn't expose sensitive details.

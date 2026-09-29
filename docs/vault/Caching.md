---
source: master plan §6
---

# Caching (Redis)

Back to [[00-Index]]

| Data | Key | TTL | Evict on |
|---|---|---|---|
| Room membership | `room:{roomId}:member:{userId}` | 5 min | member added/removed |
| Room overview | `room:{roomId}:overview` | 60 s | any room-level edit |
| Itinerary | `room:{roomId}:itinerary` | 30 s | any itinerary write |
| Checklist | `room:{roomId}:checklist` | 30 s | any checklist write |
| Settlement | `room:{roomId}:settlement` | 30 s | any expense write |
| Live locations | `room:{roomId}:locations` (Hash or GEO; Redis only) | tied to `expires_at` | update/stop. See [[Location]] |
| JWKS | `jwks:{kid}` (in-memory or Redis) | JWKS `max-age` | key rotation |

## Rules
- **Cache-aside**: write to Postgres, then **evict** the key (don't update it). A cache write must never get ahead of the DB commit.
- **Redis failure**: catch the exception, fall through to Postgres, and log a warning. **Never return a 500.**
- Evict membership keys **immediately** when a member is removed. A stale "is member" entry is a security bug. Keep both the short TTL and explicit eviction.
- Scope every key by roomId (plus userId for membership). Never use a global cache entry. See [[Security]].

---
source: master plan §9
---

# Security Plan

Back to [[00-Index]] · See also [[Auth]]

| Threat | Mitigation |
|---|---|
| Room-code guessing | 8-char codes, mixed alphanumeric, no ambiguous characters. Rate-limit `POST /rooms/join` (about 5/min per IP/user) |
| Broken object-level authorization (API1) | `@RequireRoomRole` on **every** room endpoint, plus an automated test that sweeps all endpoints |
| Broken function-level authorization (API5) | Check host-only actions server-side. Never trust a client-sent `role` |
| Mass assignment | Bind to explicit DTOs only, never to entities |
| Resource consumption (API4) | Pagination, request size limits, Bucket4j rate limits on writes (especially location) |
| JWT misuse | Verify signature, `exp`, `aud`, `iss` on every request |
| Malicious uploads | Store only a Drive file reference. Verify the file belongs to the expected Drive folder/owner before marking it `READY` |
| CORS | Allow-list the known frontend origins only |
| Cache leakage | Scope every key by room (and user for membership). No global entries |
| Location privacy | Opt-in, short TTL, hard delete on stop, rate limit |
| Secrets | `.env` and `application-local.yml` are gitignored. Production secrets live in Render env vars |

## Also build in
- A security-headers filter: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.
- Audit log lines (who/what/when) for host-only actions. No audit table.
- A `@ControllerAdvice` global handler that never leaks stack traces or SQL and always returns `{code, message}`.

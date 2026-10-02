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
| Anonymous/guest tokens | `AccountRequiredFilter` rejects anonymous or email-less JWTs globally (`401 ACCOUNT_REQUIRED`); Supabase "Allow anonymous sign-ins" stays OFF. Caveat: "Confirm email" is off, so sign-up spam needs CAPTCHA/rate limits if it appears |
| RLS vs legacy anonymous sessions | RLS read policies do not check `is_anonymous`; legacy anonymous members with still-valid sessions could read their rooms via PostgREST/Realtime. The dashboard toggle only stops NEW anonymous sign-ins. The API gate is global; direct Supabase access depends on RLS + the dashboard setting (master plan §5.4) |
| Frontend XSS/clickjacking | CSP and security headers set on the Next.js app (`next.config.ts`) |
| Secrets | `.env` and `application-local.yml` are gitignored. Production secrets live in Render env vars |

## Also build in
- A security-headers filter: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.
- Audit log lines (who/what/when) for host-only actions. No audit table.
- A `@ControllerAdvice` global handler that never leaks stack traces or SQL and always returns `{code, message}`.

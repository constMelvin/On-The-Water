# OTW — On The Water

A collaborative gala and trip planner. Friends (or a couple) plan one trip together in a shared
**gala**: who's coming, the route, what to bring, the money, the photos, and where everyone is on
the day.

Each gala is standalone. You get in by creating one ("Plan a Gala") or joining one with its
**Gala Code** and **Gala Password** ("Join a Gala"). An account (email + password) is required.

## Features

| Area | What it does |
|---|---|
| Galas | Create, join by code + password, public directory of group galas, archive / restore, leader settings and permissions |
| RSVP | Going / Maybe / Not going, travel status, leader "nudge" for Maybes |
| Itinerary | Ordered stops with drag-to-reorder, map pins and route |
| Checklist | Shared items members can claim |
| Budget & expenses | Per-gala budget, expenses with custom splits, settle-up suggestions and payments |
| Live location | Opt-in, short-lived location sharing during the gala |
| Gala Dump | Photos and videos uploaded straight to Google Drive (one folder per gala) |
| Chat | Gala chat with reactions and photos, unread counts |
| Couple mode | Bucket list, date ideas, "halfway" spot finder, couple quiz |
| Awards | End-of-trip award polls |
| Account | Profile (nickname, status, colour, photo), My Galas, notifications |

Every change other members should see is pushed live over Supabase Realtime.

## Repository layout

```
otw-server/   Backend API: Java 21, Spring Boot 4, Flyway, Redis
otw-client/   Web app: Next.js 16, React 19, TanStack Query
otw-mobile/   Android/iOS app: Expo SDK 57, Expo Router (port of the web app)
scripts/      Helper scripts
docker-compose.yml   Local Postgres + Redis + backend
```

## Architecture

```
 Web / Mobile ──(email + password)──▶ Supabase Auth ──▶ JWT
      │
      ├──(Bearer JWT)──▶ otw-server (Spring Boot) ──▶ Supabase Postgres (source of truth)
      │                        │                  └─▶ Redis (cache + rate limits, optional)
      │                        └─▶ Google Drive API (gala folders, upload links)
      │
      ├──(PUT bytes)──▶ Google Drive (one-time upload link from the backend)
      └──(subscribe)──▶ Supabase Realtime (private room:{roomId} channels)
```

- **Auth:** sign-up, login and password reset run on the client against Supabase Auth. The
  backend never issues or stores tokens; it only verifies the JWT (signature, `exp`, `iss`, `aud`)
  against Supabase's JWKS. Anonymous sessions are rejected (`401 ACCOUNT_REQUIRED`).
- **Authorization:** every `/rooms/{roomId}/**` endpoint goes through `@RequireRoomRole`
  (member or Gala Leader). Child records are always looked up inside their room.
- **Data:** Postgres is the source of truth (Flyway migrations in
  `otw-server/src/main/resources/db/migration`). Redis is a disposable cache: if it is down, the
  app falls back to Postgres and in-memory rate limits.
- **Money** uses `BigDecimal` (scale 2, HALF_UP). Itinerary and checklist edits use optimistic
  locking (`409` on a stale version). All list endpoints are paginated.
- **Files:** the backend stores Drive file ids only, never the photo or video bytes.

## Getting started

### Requirements

- JDK **21** (the build fails on 17)
- Node.js 20+ and npm
- A [Supabase](https://supabase.com) project (Postgres + Auth + Realtime)
- Optional: Redis, Docker, a Google Cloud project with the Drive API enabled

### 1. Supabase

1. Create a project and turn on the **Email** provider (Authentication → Sign In / Providers).
2. Keep **Allow anonymous sign-ins** off.
3. Authentication → URL Configuration: set **Site URL** to your frontend URL and add
   `https://<your-frontend>/**` and `http://localhost:3000/**` to **Redirect URLs** (used by the
   confirm-email and reset-password links).
4. Note the project URL, the anon (publishable) key and the service-role key.

### 2. Backend (`otw-server`)

```bash
cd otw-server
cp .env.example .env        # fill in the values (see below)
set -a && . ./.env && set +a
./mvnw spring-boot:run      # http://localhost:8080
```

Flyway creates the schema on first start. Health check: `GET /actuator/health`.
Swagger UI is off unless `API_DOCS_ENABLED=true` (then `/swagger-ui.html`).

Key variables (full list with comments in `otw-server/.env.example`):

| Variable | Purpose |
|---|---|
| `SPRING_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` | Supabase Postgres (direct or session pooler, port 5432) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Realtime broadcasts |
| `SUPABASE_JWKS_URL`, `SUPABASE_JWT_ISSUER`, `SUPABASE_JWT_AUD` | JWT verification |
| `REDIS_URL` or `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Optional cache |
| `GOOGLE_DRIVE_*` | Gala Dump uploads (blank = uploads are refused) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins |

Local Postgres + Redis instead of Supabase's database: `docker compose up -d postgres redis`.

### 3. Web app (`otw-client`)

```bash
cd otw-client
cp .env.local.example .env.local   # NEXT_PUBLIC_BACKEND_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev                        # http://localhost:3000
```

Only public values go in the client env. Never put the service-role key there.

### 4. Mobile app (`otw-mobile`)

```bash
cd otw-mobile
# .env: EXPO_PUBLIC_BACKEND_URL=http://<your PC's LAN IP>:8080,
#       EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
npx expo start                     # open in Expo Go on the same Wi-Fi
```

See `otw-mobile/README.md` for more.

## Tests and checks

```bash
cd otw-server && ./mvnw test        # JDK 21; Testcontainers tests skip without Docker
cd otw-client && npm test && npm run lint
cd otw-mobile && npx tsc --noEmit && npx expo lint
```

## Security and limits

- Per-account request limits: 60 writes/min, 180 reads/min, 10 joins/min, 10 code lookups/min,
  10 new galas/hour. Chat is capped at 20 messages/min, live location at 1 update per 3 s.
- Gala Password guessing: 5 wrong tries per account per gala, and 100 per gala, every 15 min.
- Drive uploads: 2 GB per account per day for the Gala Dump, 10 profile-photo uploads per hour.
- Request bodies over 64 KB are refused (`413 PAYLOAD_TOO_LARGE`).
- Errors never include stack traces or SQL; responses are always `{ "code", "message" }`.
- Login and sign-up limits are set in Supabase (Authentication → Rate Limits), not in this code.

## Deployment

- **Backend:** Railway (Dockerfile in `otw-server`). Set the backend env vars there and use
  `OTW_LOG_LEVEL=INFO` in production.
- **Web:** Vercel (`otw-client`), with the `NEXT_PUBLIC_*` vars.
- **Mobile:** Expo / EAS (`otw-mobile/eas.json`).

After deploying, update `CORS_ALLOWED_ORIGINS` on the backend and the Supabase Site URL and
Redirect URLs to the production frontend URL.

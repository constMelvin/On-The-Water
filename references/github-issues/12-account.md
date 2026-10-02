# [Account] My Galas, History, Notifications, Profile — Shared backlog

**Labels:** area:account, phase:1
**Screenshots:** `mygalas-desktop.png`, `mygalas-mobile.png`, `history-desktop.png`, `notifs-desktop.png`, `profile-desktop.png`
**Reference view:** `src/proto2.js → views.mygalas, history, notifs, profile`

**Ground rules (every issue)**
- Code changes only. No terminal commands (no install, dev server, build, lint, tests).
- No new dependencies. Plain CSS + inline SVG.
- Visual source of truth is `reference/otw/`. Open `reference/otw/README.md`, `reference/otw/styles.css`, the matching `src/*.js` view, and the screenshots named below. Match colors, radii, shadows, spacing, copy and behavior exactly. Do not redesign.
- Reuse the shared shell and the Phase 1 components (Button, Card, Tag, StatusBadge, Avatar, SegmentedControl, Switch, ProgressBar, Icon, Sheet, toast, burst). Do not rebuild them.
- Read data from the shared gala store. No hardcoded gala values outside the mock/dev module.
- No emoji. Respect prefers-reduced-motion. Keyboard accessible.
- When done, comment on the issue with: files changed, anything skipped, and any question.

## Phase 1 — static UI from the store
- [ ] My Galas: Upcoming / Month / Week views, gala cards (date, destination, status, role). Accountless users see the "Save this gala for later?" gate.
- [ ] History: stats + completed cards + Mga Drawing (shelved plans).
- [ ] Notifications: browser-permission banner, 7 toggles, live preview.
- [ ] Profile: avatar, name, email, sign out.

## Phase 2 — interactions (separate issue, same tab, label phase:2)
- [ ] Calendar month/week nav; view switch. Revive a shelved plan. Notification toggles + preview swap. Sign out returns to landing (galas stay). Save-gala gate routes to auth.

## Phase 3 — states + polish (separate issue, same tab, label phase:3)
- [ ] Loading, empties ("Nothing on the calendar yet." etc.), errors, offline.
- [ ] Keyboard + focus, reduced motion.

## Done when
Split into 4 sub-issues if needed (one per screen). Each matches its screenshot.

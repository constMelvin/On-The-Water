# [Who's G?] Attendance — Dev A

**Labels:** area:attendance, phase:1
**Screenshots:** `attendance-desktop.png`, `attendance-mobile.png`
**Reference view:** `src/proto2.js → views.attendance`

**Ground rules (every issue)**
- Code changes only. No terminal commands (no install, dev server, build, lint, tests).
- No new dependencies. Plain CSS + inline SVG.
- Visual source of truth is `reference/otw/`. Open `reference/otw/README.md`, `reference/otw/styles.css`, the matching `src/*.js` view, and the screenshots named below. Match colors, radii, shadows, spacing, copy and behavior exactly. Do not redesign.
- Reuse the shared shell and the Phase 1 components (Button, Card, Tag, StatusBadge, Avatar, SegmentedControl, Switch, ProgressBar, Icon, Sheet, toast, burst). Do not rebuild them.
- Read data from the shared gala store. No hardcoded gala values outside the mock/dev module.
- No emoji. Respect prefers-reduced-motion. Keyboard accessible.
- When done, comment on the issue with: files changed, anything skipped, and any question.

## Phase 1 — static UI from the store
- [ ] Header "So... who's G?" + sub.
- [ ] Big 3-way choice (I'm G teal, Maybe zest, Can't make it blossom); current choice outlined.
- [ ] Three summary tiles (going / maybe / can't make it) from store counts.
- [ ] Grouped member lists per status with avatar, name, "(you)", status badge. Mobile = single column.

## Phase 2 — interactions (separate issue, same tab, label phase:2)
- [ ] Tapping a choice writes myStatus to the store; tiles and lists update instantly; toast + burst on "I'm G".
- [ ] Leader-only "Nudge" button on Maybe members (toast only for now).

## Phase 3 — states + polish (separate issue, same tab, label phase:3)
- [ ] Loading skeleton; empty "No responses yet."; error "Couldn't save your status."; offline bar.
- [ ] Keyboard + focus, reduced motion.

## Done when
Matches `attendance-*.png`; changing status updates the dashboard too.

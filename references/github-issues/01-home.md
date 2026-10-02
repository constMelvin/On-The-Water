# [Home] Dashboard polish and wiring — Dev A

**Labels:** area:home, phase:1
**Screenshots:** `dashboard-planning-desktop.png`, `dashboard-planning-tablet.png`, `dashboard-planning-mobile.png`, `dashboard-day-desktop.png`, `dashboard-done-desktop.png`, `dashboard-state-*.png`
**Reference view:** `src/proto2.js` → `views.dashboard`, `routeStrip`, `cdown`, `seg3`

The dashboard already exists after the connect step. This issue makes it fully data-driven and finishes its states.

**Ground rules (every issue)**
- Code changes only. No terminal commands (no install, dev server, build, lint, tests).
- No new dependencies. Plain CSS + inline SVG.
- Visual source of truth is `reference/otw/`. Open `reference/otw/README.md`, `reference/otw/styles.css`, the matching `src/*.js` view, and the screenshots named below. Match colors, radii, shadows, spacing, copy and behavior exactly. Do not redesign.
- Reuse the shared shell and the Phase 1 components (Button, Card, Tag, StatusBadge, Avatar, SegmentedControl, Switch, ProgressBar, Icon, Sheet, toast, burst). Do not rebuild them.
- Read data from the shared gala store. No hardcoded gala values outside the mock/dev module.
- No emoji. Respect prefers-reduced-motion. Keyboard accessible.
- When done, comment on the issue with: files changed, anything skipped, and any question.

## Phase 1 — data-driven (this issue)
- [ ] Hero, route strip, feature cards and rail all read from the store: gala title, code, date range, destination, member counts, stops count, budget per person, spent, packed count, photo count, unread chat count.
- [ ] Hero switches by `phase`: planning ("Let's get this gala together."), gala day ("Today's the day."), done ("You made it happen."). Match copy in `views.dashboard`.
- [ ] Route strip marks steps done/current/locked by phase (planning: 5 done + 1 current; day: 6 done + 1 current; hidden when done).
- [ ] Feature card values come from the store, not literals. "Where is everyone?" shows "Opens on gala day" in planning.
- [ ] Rail: "Who's in" (first 6 members with status), Gala Code card, and the Gala Leader card only when `role === 'leader'`.

## Phase 2 — interactions (separate issue, same tab)
- [ ] Status control updates the store and reflects everywhere instantly. Toast + sparkle burst on "I'm G".
- [ ] Copy code (hero pill, rail, sidebar/top bar) copies and toasts "Gala code copied." + burst.
- [ ] Account banner dismiss hides it for the session. Share / Create an Account open the Sheets.

## Phase 3 — states (separate issue, same tab)
- [ ] Loading skeleton, empty ("Just you so far."), error ("The dashboard didn't load."), offline bar. Match `dashboard-state-*.png`.
- [ ] Keyboard + focus pass. Reduced-motion check.

## Done when
Dashboard matches all `dashboard-*.png` at 1440 / 820 / 390 and every value is real.

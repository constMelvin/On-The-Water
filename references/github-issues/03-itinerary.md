# [The plan] Itinerary (The Gala Route) — Dev A

**Labels:** area:itinerary, phase:1
**Screenshots:** `itinerary-desktop.png`, `itinerary-mobile.png`, `itinerary-sheet-addStop-desktop.png`
**Reference view:** `src/proto2.js → views.itinerary`

**Ground rules (every issue)**
- Code changes only. No terminal commands (no install, dev server, build, lint, tests).
- No new dependencies. Plain CSS + inline SVG.
- Visual source of truth is `reference/otw/`. Open `reference/otw/README.md`, `reference/otw/styles.css`, the matching `src/*.js` view, and the screenshots named below. Match colors, radii, shadows, spacing, copy and behavior exactly. Do not redesign.
- Reuse the shared shell and the Phase 1 components (Button, Card, Tag, StatusBadge, Avatar, SegmentedControl, Switch, ProgressBar, Icon, Sheet, toast, burst). Do not rebuild them.
- Read data from the shared gala store. No hardcoded gala values outside the mock/dev module.
- No emoji. Respect prefers-reduced-motion. Keyboard accessible.
- When done, comment on the issue with: files changed, anything skipped, and any question.

## Phase 1 — static UI from the store
- [ ] Header with "The Gala Route" tag + "Okay, what's the plan?".
- [ ] Numbered timeline of stop cards from the store: place, type tag (Meet-up teal / Activity zest / Food blossom), time, note, "Added by" avatar.
- [ ] Dashed route connector between stops. Desktop shows the map preview card; mobile hides it.
- [ ] Add a Stop button (desktop) / FAB (mobile).

## Phase 2 — interactions (separate issue, same tab, label phase:2)
- [ ] Reorder: up/down arrows on all sizes; drag-and-drop on desktop with a drop indicator; numbers re-sequence.
- [ ] Add a Stop sheet (place, time, type, note) appends to the store + system chat message + toast "Stop added. Everyone can see it.".
- [ ] Delete a stop (toast).

## Phase 3 — states + polish (separate issue, same tab, label phase:3)
- [ ] Loading (timeline skeleton with dashed line), empty "No stops yet. Saan tayo?", error, offline.
- [ ] Keyboard reorder + focus; reduced motion.

## Done when
Matches `itinerary-*.png`; add/reorder/delete persist to the store; dashboard stop count updates.

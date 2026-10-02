# [Checklist] Packing checklist — Dev A

**Labels:** area:checklist, phase:1
**Screenshots:** `checklist-desktop.png`, `checklist-mobile.png`
**Reference view:** `src/proto2.js → views.checklist`

**Ground rules (every issue)**
- Code changes only. No terminal commands (no install, dev server, build, lint, tests).
- No new dependencies. Plain CSS + inline SVG.
- Visual source of truth is `reference/otw/`. Open `reference/otw/README.md`, `reference/otw/styles.css`, the matching `src/*.js` view, and the screenshots named below. Match colors, radii, shadows, spacing, copy and behavior exactly. Do not redesign.
- Reuse the shared shell and the Phase 1 components (Button, Card, Tag, StatusBadge, Avatar, SegmentedControl, Switch, ProgressBar, Icon, Sheet, toast, burst). Do not rebuild them.
- Read data from the shared gala store. No hardcoded gala values outside the mock/dev module.
- No emoji. Respect prefers-reduced-motion. Keyboard accessible.
- When done, comment on the issue with: files changed, anything skipped, and any question.

## Phase 1 — static UI from the store
- [ ] Header "Don't forget the important stuff." + sub.
- [ ] Progress bar "X of Y packed" from the store.
- [ ] Filters All / Mine / Done (segmented).
- [ ] Item rows: checkbox, label, assignee avatar or Claim button, delete. Mobile rows ~64px tall.

## Phase 2 — interactions (separate issue, same tab, label phase:2)
- [ ] Toggle check writes to the store with a small pop; progress fills; "All packed." when complete + burst.
- [ ] Add item sheet (name + assign to). Claim sets assignee to current user. Delete removes.

## Phase 3 — states + polish (separate issue, same tab, label phase:3)
- [ ] Loading, empty "Nothing here yet. Pack smart.", error, offline.
- [ ] Keyboard + focus, reduced motion.

## Done when
Matches `checklist-*.png`; counts sync to the dashboard.

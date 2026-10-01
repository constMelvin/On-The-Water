# [Couple Mode] Gala for two — Dev C

**Labels:** area:couple, phase:1
**Screenshots:** `couple-desktop.png`, `couple-mobile.png`
**Reference view:** `src/proto2.js → views.couple`

**Ground rules (every issue)**
- Code changes only. No terminal commands (no install, dev server, build, lint, tests).
- No new dependencies. Plain CSS + inline SVG.
- Visual source of truth is `reference/otw/`. Open `reference/otw/README.md`, `reference/otw/styles.css`, the matching `src/*.js` view, and the screenshots named below. Match colors, radii, shadows, spacing, copy and behavior exactly. Do not redesign.
- Reuse the shared shell and the Phase 1 components (Button, Card, Tag, StatusBadge, Avatar, SegmentedControl, Switch, ProgressBar, Icon, Sheet, toast, burst). Do not rebuild them.
- Read data from the shared gala store. No hardcoded gala values outside the mock/dev module.
- No emoji. Respect prefers-reduced-motion. Keyboard accessible.
- When done, comment on the issue with: files changed, anything skipped, and any question.

## Phase 1 — static UI from the store
- [ ] Intro state: "Just the two of you?" + 4 preview cards + Start Couple Mode.
- [ ] Active state: couple header (paired avatars) + tabs Date Ideas / Places to Go / Budget for Two / Our Photos.

## Phase 2 — interactions (separate issue, same tab, label phase:2)
- [ ] Start Couple Mode flips to active (store flag) + burst.
- [ ] Heart to save/unsave date ideas (toast on save). Budget-for-two inputs recompute total + each live. Tabs switch content.

## Phase 3 — states + polish (separate issue, same tab, label phase:3)
- [ ] Loading, empty "No ideas saved yet.", error, offline.
- [ ] Keyboard + focus, reduced motion.

## Done when
Matches `couple-*.png`; saved ideas + budget-for-two persist in the store.

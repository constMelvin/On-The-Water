# [Gastos] Budget estimator — Dev B

**Labels:** area:budget, phase:1
**Screenshots:** `budget-desktop.png`, `budget-mobile.png`
**Reference view:** `src/proto2.js → views.budget, updBud`

**Ground rules (every issue)**
- Code changes only. No terminal commands (no install, dev server, build, lint, tests).
- No new dependencies. Plain CSS + inline SVG.
- Visual source of truth is `reference/otw/`. Open `reference/otw/README.md`, `reference/otw/styles.css`, the matching `src/*.js` view, and the screenshots named below. Match colors, radii, shadows, spacing, copy and behavior exactly. Do not redesign.
- Reuse the shared shell and the Phase 1 components (Button, Card, Tag, StatusBadge, Avatar, SegmentedControl, Switch, ProgressBar, Icon, Sheet, toast, burst). Do not rebuild them.
- Read data from the shared gala store. No hardcoded gala values outside the mock/dev module.
- No emoji. Respect prefers-reduced-motion. Keyboard accessible.
- When done, comment on the issue with: files changed, anything skipped, and any question.

## Phase 1 — static UI from the store
- [ ] Header "Let's talk gastos." + "Before the gala" tag.
- [ ] Five category inputs (Transportation, Stay, Food, Activities, Other) + people stepper, from the store.
- [ ] Result cards: estimated total (zest), per person (rosy). Category split bar + legend.

## Phase 2 — interactions (separate issue, same tab, label phase:2)
- [ ] Editing any amount or the people count recalculates total, per-person and the split bar live (see `updBud`) and writes to the store; toast "Budget updated.".
- [ ] "Go to Ambagan" link routes to expenses.

## Phase 3 — states + polish (separate issue, same tab, label phase:3)
- [ ] Loading, empty "No estimates yet.", error ("numbers kept on this screen"), offline.
- [ ] Keyboard + focus, reduced motion.

## Done when
Matches `budget-*.png`; per-person value matches the dashboard card.

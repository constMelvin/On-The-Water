# [Ambagan] Expense tracker — Dev B

**Labels:** area:expenses, phase:1
**Screenshots:** `expenses-desktop.png`, `expenses-mobile.png`, `expenses-sheet-addExp-desktop.png`
**Reference view:** `src/proto2.js → views.expenses, calcDebts`

**Ground rules (every issue)**
- Code changes only. No terminal commands (no install, dev server, build, lint, tests).
- No new dependencies. Plain CSS + inline SVG.
- Visual source of truth is `reference/otw/`. Open `reference/otw/README.md`, `reference/otw/styles.css`, the matching `src/*.js` view, and the screenshots named below. Match colors, radii, shadows, spacing, copy and behavior exactly. Do not redesign.
- Reuse the shared shell and the Phase 1 components (Button, Card, Tag, StatusBadge, Avatar, SegmentedControl, Switch, ProgressBar, Icon, Sheet, toast, burst). Do not rebuild them.
- Read data from the shared gala store. No hardcoded gala values outside the mock/dev module.
- No emoji. Respect prefers-reduced-motion. Keyboard accessible.
- When done, comment on the issue with: files changed, anything skipped, and any question.

## Phase 1 — static UI from the store
- [ ] Header "Okay, sino nag-abono?" + "Ambagan" tag.
- [ ] Four summary tiles: total spent, your share, you've paid, remaining (with owed/owe label).
- [ ] Expense list (payer avatar, name, category tag, split note, amount).
- [ ] "Who owes whom" panel split into "With you" and "Everyone else".

## Phase 2 — interactions (separate issue, same tab, label phase:2)
- [ ] Add expense sheet appends to the store; debts recompute via `calcDebts` (greedy settle); toast + burst.
- [ ] "Mark paid" clears a single debt; when all clear show "All settled. Walang may habol." + burst.

## Phase 3 — states + polish (separate issue, same tab, label phase:3)
- [ ] Loading, empty "No expenses yet. Walang nag-abono. Pa.", error, offline.
- [ ] Keyboard + focus, reduced motion.

## Done when
Matches `expenses-*.png`; totals match the dashboard "Who paid?" card. **Keep the `calcDebts` math identical to the reference.**

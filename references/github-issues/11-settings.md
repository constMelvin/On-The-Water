# [Settings] Gala settings — Dev B

**Labels:** area:settings, phase:1
**Screenshots:** (no dedicated shot; build from `views.settings` + card/switch styles)
**Reference view:** `src/proto2.js → views.settings`

**Ground rules (every issue)**
- Code changes only. No terminal commands (no install, dev server, build, lint, tests).
- No new dependencies. Plain CSS + inline SVG.
- Visual source of truth is `reference/otw/`. Open `reference/otw/README.md`, `reference/otw/styles.css`, the matching `src/*.js` view, and the screenshots named below. Match colors, radii, shadows, spacing, copy and behavior exactly. Do not redesign.
- Reuse the shared shell and the Phase 1 components (Button, Card, Tag, StatusBadge, Avatar, SegmentedControl, Switch, ProgressBar, Icon, Sheet, toast, burst). Do not rebuild them.
- Read data from the shared gala store. No hardcoded gala values outside the mock/dev module.
- No emoji. Respect prefers-reduced-motion. Keyboard accessible.
- When done, comment on the issue with: files changed, anything skipped, and any question.

## Phase 1 — static UI from the store
- [ ] Leader view: Gala details (title/date/destination), Access (code + password + "Make a new gala code"), Members (remove), Permissions switches, Danger zone (archive/delete).
- [ ] Member view: your name, share-location toggle, and "Coming back later" note with Leave gala. **Members never see admin controls.**

## Phase 2 — interactions (separate issue, same tab, label phase:2)
- [ ] Switches toggle store flags. Destructive actions (remove, reset code, archive, delete, leave) open a confirm sheet, then toast. Copy code works.

## Phase 3 — states + polish (separate issue, same tab, label phase:3)
- [ ] Loading, error "Couldn't save. Nothing changed.", offline. Save shows toast "Saved.".
- [ ] Keyboard + focus, reduced motion.

## Done when
Leader and member views differ correctly; destructive actions are confirmed.

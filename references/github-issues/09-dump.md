# [Gala Dump] Photo gallery — Dev C

**Labels:** area:dump, phase:1
**Screenshots:** `dump-desktop.png`, `dump-mobile.png`, `dump-sheet-upload-desktop.png`
**Reference view:** `src/proto2.js → views.dump, lbHtml, getPhotos`

**Ground rules (every issue)**
- Code changes only. No terminal commands (no install, dev server, build, lint, tests).
- No new dependencies. Plain CSS + inline SVG.
- Visual source of truth is `reference/otw/`. Open `reference/otw/README.md`, `reference/otw/styles.css`, the matching `src/*.js` view, and the screenshots named below. Match colors, radii, shadows, spacing, copy and behavior exactly. Do not redesign.
- Reuse the shared shell and the Phase 1 components (Button, Card, Tag, StatusBadge, Avatar, SegmentedControl, Switch, ProgressBar, Icon, Sheet, toast, burst). Do not rebuild them.
- Read data from the shared gala store. No hardcoded gala values outside the mock/dev module.
- No emoji. Respect prefers-reduced-motion. Keyboard accessible.
- When done, comment on the issue with: files changed, anything skipped, and any question.

## Phase 1 — static UI from the store
- [ ] Header "The Gala Dump" + sub. Filters Everyone / Mine. Photo count.
- [ ] Masonry gallery from the store (4 cols desktop, 2 mobile) with caption on hover/tap; delete control on own photos.
- [ ] Add Photos button (desktop) / FAB (mobile).

## Phase 2 — interactions (separate issue, same tab, label phase:2)
- [ ] Upload sheet simulates per-file progress; **one file fails at 62% with Retry**; Done adds photos to the store + toast "3 photos added." + burst.
- [ ] Lightbox: open, prev/next, arrow keys, Esc; swipe on mobile. Delete-own asks a confirm sheet.
- [ ] **Never mention Google Drive or where files are stored.**

## Phase 3 — states + polish (separate issue, same tab, label phase:3)
- [ ] Loading (masonry skeleton), empty "No memories yet. Go make some.", failed-upload banner + Retry, offline.
- [ ] Keyboard + focus, reduced motion.

## Done when
Matches the dump screenshots; upload sim + lightbox + delete work; no storage tech shown.

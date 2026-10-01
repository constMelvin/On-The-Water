# [Who's OTW?] Live location — Dev C

**Labels:** area:location, phase:1
**Screenshots:** `location-desktop.png`, `location-mobile.png`, `location-sheet-locPerm-desktop.png`, `location-denied-desktop.png`
**Reference view:** `src/proto2.js → views.location, mapSvg`

**Ground rules (every issue)**
- Code changes only. No terminal commands (no install, dev server, build, lint, tests).
- No new dependencies. Plain CSS + inline SVG.
- Visual source of truth is `reference/otw/`. Open `reference/otw/README.md`, `reference/otw/styles.css`, the matching `src/*.js` view, and the screenshots named below. Match colors, radii, shadows, spacing, copy and behavior exactly. Do not redesign.
- Reuse the shared shell and the Phase 1 components (Button, Card, Tag, StatusBadge, Avatar, SegmentedControl, Switch, ProgressBar, Icon, Sheet, toast, burst). Do not rebuild them.
- Read data from the shared gala store. No hardcoded gala values outside the mock/dev module.
- No emoji. Respect prefers-reduced-motion. Keyboard accessible.
- When done, comment on the issue with: files changed, anything skipped, and any question.

## Phase 1 — static UI from the store
- [ ] Header "Who's actually OTW?" + campaign tag.
- [ ] Sharing banner in three variants: private (Share button), sharing on (live dot + Stop), denied (how to re-enable).
- [ ] Map with member pins (status ring styles + pulse on moving pins), map status tags, selected-pin callout.
- [ ] Side: manual status picker (Still at home / On the way / Almost there / Already there), Everyone list, Privacy card.

## Phase 2 — interactions (separate issue, same tab, label phase:2)
- [ ] Permission sheet before sharing; allowing sets sharing on (banner + your pin) + toast + burst; Stop turns it off.
- [ ] Manual status picker updates your pin/label. Selecting a pin opens the callout.

## Phase 3 — states + polish (separate issue, same tab, label phase:3)
- [ ] Loading (map skeleton), empty "Nobody's sharing yet.", **permission denied** state (match `location-denied-desktop.png`, keep privacy controls visible), offline.
- [ ] Keyboard: pins focusable/activatable; reduced motion disables pulse.

## Done when
Matches the location screenshots. **Privacy copy and the always-visible Stop are required; do not hide them behind jokes.**

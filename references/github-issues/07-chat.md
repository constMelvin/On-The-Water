# [Chismis] Group chat — Dev C

**Labels:** area:chat, phase:1
**Screenshots:** `chat-desktop.png`, `chat-mobile.png`
**Reference view:** `src/proto2.js → views.chat`

**Ground rules (every issue)**
- Code changes only. No terminal commands (no install, dev server, build, lint, tests).
- No new dependencies. Plain CSS + inline SVG.
- Visual source of truth is `reference/otw/`. Open `reference/otw/README.md`, `reference/otw/styles.css`, the matching `src/*.js` view, and the screenshots named below. Match colors, radii, shadows, spacing, copy and behavior exactly. Do not redesign.
- Reuse the shared shell and the Phase 1 components (Button, Card, Tag, StatusBadge, Avatar, SegmentedControl, Switch, ProgressBar, Icon, Sheet, toast, burst). Do not rebuild them.
- Read data from the shared gala store. No hardcoded gala values outside the mock/dev module.
- No emoji. Respect prefers-reduced-motion. Keyboard accessible.
- When done, comment on the issue with: files changed, anything skipped, and any question.

## Phase 1 — static UI from the store
- [ ] Pinned plan card at top (date, destination, stops, per-person).
- [ ] Message list from the store: member messages (avatar, name, time, bubble), own messages right-aligned rosy, system messages, itinerary "card" messages, unread divider.
- [ ] Quick-reply chips + composer. Desktop shows the right panel (locked-in + online now); mobile hides it. Composer sits above the mobile bottom nav.

## Phase 2 — interactions (separate issue, same tab, label phase:2)
- [ ] Send writes to the store and appends instantly; Enter sends. Quick-reply chips send. Tap a message to toggle a heart reaction. Autoscroll to newest.

## Phase 3 — states + polish (separate issue, same tab, label phase:3)
- [ ] Loading (message skeletons), empty "Quiet in here. Say something.", error "Message didn't send. Tap to retry.", offline.
- [ ] Keyboard + focus, reduced motion.

## Done when
Matches `chat-*.png`; dashboard unread count reflects new messages.

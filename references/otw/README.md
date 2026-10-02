# OTW design reference (source of truth)

Everything here is the approved OTW UI. When a prompt says "match the reference", match these files exactly.

- `otw-app.html`      Runnable single-file app. Open in a browser. Dashboard = `#/dashboard`. Design system = `#/system`. Plan flow = `#/plan`, `#/created`. The floating "Demo" button (bottom-right) switches phase (planning / gala day / done), role (leader / member), account on/off and screen state (loading / empty / error / offline / success). It is a preview tool, NOT part of the product.
- `styles.css`        The complete stylesheet. Ignore doc-only classes (.dnav .pg .hero-d .jrow .spec .dsg etc). Take everything else.
- `src/data.js`       Icon dictionary `IC` (all icons), sample data (G, MEM, ST, STOPS0, ITEMS0, EXP0...), helpers.
- `src/proto1.js`     State, helpers, toast + sparkle burst, EMPTY/ERR maps, gate(), appShell(), plan wizard + created screens.
- `src/proto2.js`     views.dashboard, routeStrip, cdown, seg3 (+ other screens, ignore those for now).
- `src/proto3.js`     render(), go(), sheetHtml() (share, account, more), event actions.
- `screenshots/`      Desktop 1440, tablet 820, mobile 390, plus phases, states and sheets.

## How the artifact works (translate, don't copy)
It is vanilla JS that returns HTML strings. Do NOT copy that architecture. Rebuild it in this repo's framework, but keep the markup structure, class names' visual rules, copy and behavior identical.

The artifact switches layout with `data-device="desktop|tablet|mobile"` set from window width. In the repo, use real media queries with the same breakpoints:
- mobile  < 640px
- tablet  640px to 1023px
- desktop >= 1024px

Per-device CSS variables in the artifact (`.device[data-device=...]`):
| var    | desktop | tablet | mobile |
|--------|---------|--------|--------|
| --pad  | 44px    | 30px   | 18px   |
| --h1   | 58px    | 46px   | 36px   |
| --h2   | 40px    | 32px   | 28px   |
| --gap  | 20px    | 20px   | 14px   |
| --nf (feature grid cols) | 3 | 2 | 2 |
| --n3   | 3       | 2      | 1      |

On desktop >= 1560px the artifact widens side padding so content is centered (see the bottom of styles.css).

## Brand rules (non-negotiable)
- Only these colors: rosy #e0417c, rosy-dark #c22e64, zest #f8e140, zest-dark #c9b418, blossom #eac7df, teal #2f8aa3, teal-dark #1f6376, cream #fff8f2. Hex only inside :root. No pure white, no black, no grey shadows.
- Fonts: Fredoka 500/600/700 for display + buttons, Nunito 600/700/800 for body. Sentence case. No all-caps labels, no serifs, no light weights.
- Body text is teal-dark on cream (plain teal fails contrast).
- Pill buttons with a solid offset shadow in their own darker tone; on :active they drop 5px and the shadow shrinks 7px to 2px.
- Cards: 22-28px radius, 3px cream border. Blob cards use asymmetric radii.
- No emoji anywhere. Inline SVG icons only (24px viewBox, 2px rounded stroke).
- Sparkle burst (5-7 sparkles, ~700ms) only on confirming actions. Card hover lift only on hover:hover devices.
- Mobile bottom nav is exactly 3 large circular icon buttons, no labels.
- Respect prefers-reduced-motion.

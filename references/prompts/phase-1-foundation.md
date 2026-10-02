# Phase 1: Foundation (tokens, fonts, primitives, icons, mock data)

Build the OTW design foundation so the dashboard and every later screen can reuse it.

Ground rules for this task:
- CODE CHANGES ONLY. Do not run any terminal commands (no install, dev server, build, lint, tests). Read and edit files only.
- Do not add dependencies. Use plain CSS and inline SVG.
- Do not edit files that belong to teammates (join a gala, and anything in the plan-a-gala flow unless this prompt says so). If you must touch a shared file, make the smallest possible change and list it at the end.
- The visual source of truth is reference/otw/ (see reference/otw/README.md). Open reference/otw/styles.css and reference/otw/src/*.js and the PNGs in reference/otw/screenshots/. Match colors, radii, shadows, spacing, copy and behavior exactly. Do not redesign, do not "improve".
- First, read package.json and the folder structure (read-only) to detect the framework, router, styling approach and naming conventions. Follow what already exists. Say in one line what you detected before you start coding.

## Tasks
1. **Tokens.** Add the eight brand colors as CSS variables in one shared file (`--rosy --rosy-dark --zest --zest-dark --blossom --teal --teal-dark --cream`) plus `--fd` (Fredoka) and `--fb` (Nunito). Copy the `:root` block from reference/otw/styles.css, including the per-breakpoint variables (--pad, --h1, --h2, --gap, --n3, --nf). Hex values live only inside :root.
2. **Fonts.** Load Fredoka 500/600/700 and Nunito 600/700/800 using this repo's normal method. Body defaults: teal-dark text on cream, weight 700, sentence case.
3. **Global styles.** Port from reference/otw/styles.css, matching values exactly: base reset, headings, focus-visible outline, .btn (rosy, zest, teal, cream, ghost, sm, icon; solid offset shadow; :active squish), .in inputs, .seg segmented control, .chip, .sw switch, .tag with status variants (st-g, st-m, st-x, l-home, l-otw, l-almost, l-there), .av + .stack, .badge, .ico blob container, .card + c-rosy/c-zest/c-teal/c-blossom/c-cream, .lift (only inside @media (hover:hover)), skeleton pulse, .toast, .spark keyframes, prefers-reduced-motion. Skip doc-only classes (.dnav .pg .hero-d .jrow .spec .dsg etc).
4. **Components** (in this repo's idiom, typed if the repo uses TypeScript): Icon, Button, Tag, StatusBadge, Avatar, AvatarStack, IconBlob, Card, SegmentedControl, Switch, ProgressBar.
   - Icon: port the full `IC` dictionary from reference/otw/src/data.js (24px viewBox, stroke 2, round caps and joins, currentColor; sparkle is a filled path). Props: name, size, className.
   - IconBlob uses the asymmetric radius list `BLOBS` from reference/otw/src/proto1.js, picked by index.
   - Avatar: colored circle with initial, 3px cream border, optional online dot. Colors per member come from data (rosy, teal, zest, blossom) and text color follows the reference (.pf/.c-* rules).
5. **Utilities.** `toast(message, kind?)` (bottom-center pill, auto-dismiss ~2.6s) and `burst(x, y)` plus `burstEl(element)` (7 sparkles, ~700ms, skipped when reduced motion is on). Port from reference/otw/src/proto1.js.
6. **Mock data + helpers.** Create a data module from reference/otw/src/data.js: gala `G`, members `MEM`, statuses `ST`, location statuses `LOC`, `STOPS0`, `ITEMS0`, `EXP0`, and helpers `peso`, `counts`, `budTotal`, `spent`. Add clear types. Keep it easy to swap for a real API later.
7. **Kit page.** Add a dev-only route (for example /dev/kit) that renders every primitive and icon so I can compare it with reference/otw/otw-app.html at #/system.

## Acceptance
- Colors, radii, shadows and type match the reference. No hex outside :root, no emoji, no new dependencies.
- Buttons squish on press. Reduced motion disables animations.
- At the end, list every file you created or changed and anything you were unsure about.

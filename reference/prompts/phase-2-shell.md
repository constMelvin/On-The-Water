# Phase 2: Gala app shell (sidebar, top bar, mobile nav, sheets, placeholder pages)

Build the responsive shell that wraps every screen inside a gala. Phase 1 must already be done.

Ground rules for this task:
- CODE CHANGES ONLY. Do not run any terminal commands (no install, dev server, build, lint, tests). Read and edit files only.
- Do not add dependencies. Use plain CSS and inline SVG.
- Do not edit files that belong to teammates (join a gala, and anything in the plan-a-gala flow unless this prompt says so). If you must touch a shared file, make the smallest possible change and list it at the end.
- The visual source of truth is reference/otw/ (see reference/otw/README.md). Open reference/otw/styles.css and reference/otw/src/*.js and the PNGs in reference/otw/screenshots/. Match colors, radii, shadows, spacing, copy and behavior exactly. Do not redesign, do not "improve".
- First, read package.json and the folder structure (read-only) to detect the framework, router, styling approach and naming conventions. Follow what already exists. Say in one line what you detected before you start coding.

## Tasks
1. **Route group** for a gala: `/gala/:code` (dashboard) and child routes: attendance, route, budget, ambagan, checklist, chat, map, dump, couple, settings. Use this repo's router. Every child route except dashboard renders a simple placeholder page inside the shell: heading + one line ("Coming soon") in the OTW style (see reference/otw/src/proto2.js `head()` and `.phead` CSS). Do not build those features.
2. **Desktop shell (>= 1024px).** Left sidebar 244px wide, teal-dark background: logo (pin icon in zest + "OTW"), gala mini card (teal background, gala title, date range, copy-code pill), nav items (Home, Who's G?, The plan, Gastos, Ambagan, Checklist, Chismis with unread badge, Who's OTW?, Gala Dump, Couple Mode), footer with Settings and a zest "Save this gala" card (shown when there is no account). Active item = cream pill with teal-dark text. Top bar: gala title, code pill, role chip (Gala Leader = zest with crown icon, Member = blossom), avatar stack. Copy structure from `appShell()` and `galaMini()` in reference/otw/src/proto1.js and .side/.sn/.topbar rules in reference/otw/styles.css.
3. **Tablet shell (640-1023px).** Sidebar collapses to a 78px icon rail (labels, gala card and wordmark hidden, badge moves to the icon corner). Show the plan tab strip under the top bar (Who's G?, The plan, Gastos, Ambagan, Checklist) on plan-related pages.
4. **Mobile shell (< 640px).** No sidebar. Top bar with a more (three dots) button, the gala title (ellipsis) and no avatar stack. Bottom nav is EXACTLY three 58px circular icon buttons, no labels: Home, Chat (with unread badge), Map. Active = solid teal with teal-dark shadow and cream icon; inactive = 3px blossom border with teal icon. The "more" button opens the More bottom sheet (grid of destinations, copy from `sheetHtml()` case 'more' in reference/otw/src/proto3.js). Main content gets bottom padding so nothing hides behind the nav.
5. **Sheet component** (used now for More, Share, Account): centered modal on tablet/desktop (max 520px, 32px radius, offset rosy shadow), bottom sheet on mobile (grab handle, top radius 32px). Overlay is teal-dark at 55% opacity. Closes on overlay click, close button and Escape; focus is trapped; role=dialog, aria-modal.
6. **Toast host** mounted once in the shell (bottom center, above the mobile nav).
7. **State context.** Create a small gala context/store (whatever fits this repo) holding: gala, members, role ("leader" | "member"), phase ("planning" | "day" | "done"), hasAccount, myStatus ("g" | "m" | "x"), stops, checklist items, budget, expenses. Seed it from the mock data module. Phase 3 reads from it.

## Acceptance
- At 1440, 820 and 390 px the shell matches reference/otw/screenshots/dashboard-planning-*.png (ignore the dashboard body for now).
- Keyboard: nav items, sheet open/close and Escape work. Focus rings visible.
- List every file you created or changed at the end.

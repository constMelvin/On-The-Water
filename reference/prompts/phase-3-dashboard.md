# Phase 3: Gala dashboard (gala owner / leader view)

Build the dashboard page at `/gala/:code` inside the Phase 2 shell. It must look and behave exactly like reference/otw/otw-app.html at #/dashboard.

Ground rules for this task:
- CODE CHANGES ONLY. Do not run any terminal commands (no install, dev server, build, lint, tests). Read and edit files only.
- Do not add dependencies. Use plain CSS and inline SVG.
- Do not edit files that belong to teammates (join a gala, and anything in the plan-a-gala flow unless this prompt says so). If you must touch a shared file, make the smallest possible change and list it at the end.
- The visual source of truth is reference/otw/ (see reference/otw/README.md). Open reference/otw/styles.css and reference/otw/src/*.js and the PNGs in reference/otw/screenshots/. Match colors, radii, shadows, spacing, copy and behavior exactly. Do not redesign, do not "improve".
- First, read package.json and the folder structure (read-only) to detect the framework, router, styling approach and naming conventions. Follow what already exists. Say in one line what you detected before you start coding.

## Build these sections, in this order (copy structure from `views.dashboard`, `cdown`, `seg3`, `routeStrip` in reference/otw/src/proto2.js)
1. **Hero band** (rosy, 32px radius). Planning phase: h1 "Let's get this gala together.", gala title, three cream tags (date range with calendar icon, destination with pin, "10 people" with users icon), on the right the countdown (three cream tiles: 45 days, 20 hours, 19 mins, from a fixed demo clock constant) and "Your status" with a 3-option segmented control (I'm G, Maybe, Can't make it). Gala day phase: h1 "Today's the day.", subtitle with title and destination, tags ("1 already there", "1 almost there", "2 on the way"), zest button "Open the map" plus the status control. Done phase: h1 "You made it happen.", line "From “G tayo?” to an actual day on the calendar.", zest button "See the recap" (route to a placeholder). On tablet and mobile the right column stacks below.
2. **Account banner** (zest, only when there is no account and it has not been dismissed): sparkle icon, "Want to keep your gala with you?", "Save your galas, calendar, history and reminders. This gala works fine without an account.", rosy small button "Create an Account" (opens the Account sheet) and an X to dismiss.
3. **Journey route strip** (hidden in done phase): 8 steps: G tayo?, When, Who's G?, Plan, How much, What we need, Where is everyone, OTW na. Planning phase: first 5 done (solid teal circle with check, solid teal connector), 6th current (zest circle, rosy border and shadow), last 2 locked (dashed blossom connector, 75% opacity). Gala day: first 6 done, 7th current. Horizontal scroll on small screens. Each step links to its page.
4. **Feature grid** (3 columns desktop, 2 on tablet and mobile) with the 9 cards, exact titles and colors: Who's G? (blossom, "7 going · 2 maybe", tag Attendance), What's the plan? (zest, "5 stops on the route", Itinerary), How much? (cream, "₱2,450 per person", Budget), Who paid? (teal, "₱9,120 spent so far", Ambagan), What are we bringing? (blossom, "3 of 7 packed", Checklist), Where is everyone? (rosy, "Opens on gala day" in planning), What's the chismis? (zest, "2 new messages", Chat), What did we get? (cream, "No memories yet" until photos exist), Just the two of you? (blossom, "Same OTW energy.", Couple Mode). Values come from the state, not hardcoded. Card shape 28/28/28/14px radius, 3px cream border, offset shadow in the card's darker tone, blob icon container (rotate through BLOBS). Hover lift + slight rotate only on hover devices. Whole card is a link. Text is cream on teal and rosy cards, teal-dark on the rest.
5. **Right rail** (desktop only column of 268px; below the grid on tablet and mobile): "Who's in" card (first 6 members, avatar with online dot, name with "(you)" for the leader, status badge, "See everyone" link); zest "Gala Code" card with a big copyable code and "Friends join with this code."; for role leader only, a "Gala Leader" card with "Edit details, manage members and access." and a teal small button "Manage gala" linking to settings.

## Interactions
- Changing status updates myStatus immediately: hero, member list, feature card counts. Show toast "You're marked as G. The chat knows." and sparkle burst for I'm G; other choices toast "Status updated: <label>."
- Copy code (hero pill, rail card, sidebar/top bar pill): copy to clipboard, toast "Gala code copied.", sparkle burst.
- Account banner X hides it for the session.
- Share Gala and Create an Account open the corresponding Sheets (copy content from `sheetHtml()` in reference/otw/src/proto3.js). Create an Account routes to the auth route if it exists, otherwise a placeholder route.

## States (see reference/otw/screenshots/dashboard-state-*.png)
- Loading: skeleton blocks (blossom, pulsing). Empty (no other members): "Just you so far." + "Share the gala code and get your friends in." + Share Gala button. Error: "The dashboard didn't load." + "Your gala is safe. Give it another try." + Try again. Offline: zest bar "Connection's a bit shaky. You're seeing the last saved version. Anything you change will sync when you're back online."
- Add a temporary dev switcher (dev-only, easy to delete) for phase, role, account and state so I can review each variant without editing code.

## Acceptance
- Compare against every dashboard screenshot in reference/otw/screenshots at 1440, 820 and 390 px. Spacing, radii, shadows, colors and copy must match.
- Role member hides the Leader card and shows the blossom "Member" chip.
- No emoji, no hex outside :root, no new dependencies, reduced motion respected.
- List every file created or changed, and anything that differs from the reference and why.

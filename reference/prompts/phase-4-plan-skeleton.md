# Phase 4: Plan a Gala (SKELETON ONLY, teammates will finish it)

Teammates own the real Plan a Gala and Join a Gala flows. Build only a skeleton that has the right structure, copy and look, and clear places for them to plug in. Do not build backend logic.

Ground rules for this task:
- CODE CHANGES ONLY. Do not run any terminal commands (no install, dev server, build, lint, tests). Read and edit files only.
- Do not add dependencies. Use plain CSS and inline SVG.
- Do not edit files that belong to teammates (join a gala, and anything in the plan-a-gala flow unless this prompt says so). If you must touch a shared file, make the smallest possible change and list it at the end.
- The visual source of truth is reference/otw/ (see reference/otw/README.md). Open reference/otw/styles.css and reference/otw/src/*.js and the PNGs in reference/otw/screenshots/. Match colors, radii, shadows, spacing, copy and behavior exactly. Do not redesign, do not "improve".
- First, read package.json and the folder structure (read-only) to detect the framework, router, styling approach and naming conventions. Follow what already exists. Say in one line what you detected before you start coding.
- Put all new code in ONE new folder for this feature (for example features/plan-a-gala/). If a plan or join route or folder already exists, do not modify it; tell me and stop after creating the skeleton beside it.

## Tasks
1. **Focus layout** (no sidebar): full-bleed colored screen, top row with the OTW logo and a round ghost X button (returns to landing). Content column max 640px; sticky bottom bar with Back (ghost) and the primary button. The background color changes per step: step 1 rosy, step 2 zest, step 3 teal, step 4 blossom. Primary button color per step: zest on rosy and teal, rosy on zest and blossom. Copy structure from `views.plan` in reference/otw/src/proto1.js and .focus/.wiz/.fbar rules in reference/otw/styles.css. Screenshots: reference/otw/screenshots/plan-step*-*.png.
2. **Progress**: four pills (44x12px) plus "Step N of 4".
3. **Steps** (each as its own small component with props `value`, `onChange`, `error`; inputs can be basic):
   - Step 1: "First things first. What are we calling this gala?", helper "Give your gala a name your GC will remember.", text input (placeholder "Baguio Before Graduation"), chip "Use example".
   - Step 2: "When are we going?", helper "Let's turn “someday” into an actual date.", date, optional start time, optional end time.
   - Step 3: pill tag "Saan Tayo?" then "Where are we headed?", helper "Type a place or pick one. You can add exact stops later.", destination input with search icon, suggestion chips (Baguio City, Tagaytay, La Union, Batangas). Leave a clearly marked TODO for real place search.
   - Step 4: "Create a gala password", helper "You'll need this if you come back later.", password + confirm with show/hide, 3-segment strength meter, and the explainer with two rows: "Gala Code identifies your gala. Friends use it to join." and "Gala Password is private. Use it with the code to come back later." Final button label is "Tara G!".
4. **Validation messages** (exact): title "Give it a name first. Your GC needs something to search for."; date "Pick a date, even a tentative one. “Someday” isn't a date."; destination "Saan tayo? Tell us where you're headed."; password "Make it at least 6 characters."; mismatch "Hindi pa magkapareho. Check the password again." Show as a cream box with rosy-dark text and border, and validate only when Next is pressed.
5. **Created screen** (rosy): "Okay, this is happening.", "Your gala is ready. Share the code with your friends so they can jump in.", dashed-border cream ticket with big rosy code, buttons Copy Gala Code (zest) and Share Gala (cream), masked Gala Password row with show and copy icon buttons, the line "Share the Gala Code with your friends. Keep the Gala Password somewhere safe so you can come back later.", a cream account prompt card ("Want to keep your gala with you?", buttons Create an Account and Maybe Later, and "Your current gala can still continue without an account."), and a sticky zest "Enter the Gala" button that routes to /gala/:code. Sparkle burst on arrival.
6. **Contract for teammates.** Create one file, for example `gala-draft.ts` (or the repo's equivalent), with the `GalaDraft` shape (title, date, startTime?, endTime?, destination, password) and a stub `createGala(draft)` that returns `{ code: 'OTW-7K2P' }` after a short delay. Mark every place they should wire real logic with `// TODO(team):`. Add a short README.md in the folder explaining the files, the props, and how to replace the stub.

## Acceptance
- Structure, copy, colors and layout match reference/otw/otw-app.html at #/plan and the plan-* screenshots at 1440, 820 and 390 px.
- Keyboard: Enter advances; focus rings visible. No new dependencies, no emoji.
- Do not modify anything outside the new folder except the route registration; list every changed file.

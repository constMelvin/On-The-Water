# OTW frontend issues (GitHub-ready)

Each `.md` file is one GitHub issue. Paste the file body into a new issue, or use the `gh` commands in `IMPORT.md`.

## Labels used
- `area:home`, `area:attendance`, `area:itinerary`, `area:checklist`, `area:budget`, `area:expenses`, `area:chat`, `area:location`, `area:dump`, `area:couple`, `area:settings`, `area:account`
- `phase:1`, `phase:2`, `phase:3`
- `good-first-issue` on the light ones

## Who does what (3 people)
The work is split so the three of you rarely touch the same file. Each person owns a lane across all phases.

- **Dev A (Merylle)** planning core: Home polish, Who's G?, The plan, Checklist
- **Dev B** money + settings: Gastos (budget), Ambagan (expenses), Gala settings
- **Dev C** live + memories: Chismis (chat), Who's OTW? (location), Gala Dump, Couple Mode
- **Account screens** (My Galas, History, Notifications, Profile) are a shared backlog: whoever is free takes one.

## Phases
- **Phase 1** = static UI from the store, no writes. Get every tab looking right first.
- **Phase 2** = interactions and local writes (add, edit, toggle, reorder, upload sim) against the store.
- **Phase 3** = states (loading, empty, error, offline) + polish + accessibility pass.

Run Phase 1 for all tabs before Phase 2, so the app looks complete early and merges stay small.

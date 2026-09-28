---
source: docs/OTW_Backend_Master_Plan.md
type: index
---

# OTW Backend — Vault Index

These notes are condensed summaries of `docs/OTW_Backend_Master_Plan.md`.
**The master plan is authoritative.** If a note and the plan disagree, the plan wins; report the drift and fix the note.

## Which note to read

| Task touches… | Read |
|---|---|
| Package layout, guiding rules | [[Structure]] |
| Tables, columns, indexes, migrations, optimistic locking | [[Schema]] |
| Endpoints, paths, required roles | [[API]] |
| JWT verification, guards, role matrices, RLS | [[Auth]] |
| Redis keys, TTLs, eviction, fallback | [[Caching]] |
| Realtime events, channels, publish-after-commit | [[Realtime]] |
| Pin / live location sharing | [[Location]] |
| Threats and mitigations, headers, audit logs | [[Security]] |
| Tests, load targets, environments, CI, release checklist | [[Testing-Deploy]] |
| Roadmap, sprint exit gates, open questions | [[Sprints]] |

## When to open the full plan instead
- Writing or changing the spec itself.
- Needing exact code samples (e.g. `SecurityConfig` in §5.1.1).
- A note is ambiguous or seems to conflict with the task.

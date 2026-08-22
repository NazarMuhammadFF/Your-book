---
description: Implement BookNote Phase 1 UI foundation
agent: build
---

Read all project instruction files first:

- `AGENTS.md`
- `PRD.md`
- `DESIGN.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `CURRENT_PHASE.md`
- `DECISIONS.md`

Confirm from `CURRENT_PHASE.md` that Phase 1 is still active. If it is not active, stop and report the mismatch instead of implementing Phase 1.

Implement **Phase 1 — Navigable UI Foundation** completely, but do not implement future phases.

Required outcome:

- Feature-oriented React structure appropriate to the current scaffold.
- Library screen with an attractive bookshelf prototype.
- Reusable Book component designed so CSS 3D depth can be enhanced later.
- Several mock books with tasteful variation.
- New Book / Create Book screen.
- Book preview driven by local form state.
- Basic title and typography setting controls/placeholders suitable for Phase 1.
- Book Workspace shell.
- Document View / Book View placeholder toggle.
- Working navigation: Library → Create Book; Library → mock Book Workspace; back/close to Library.
- Centralized semantic design tokens.
- Centralized motion presets.
- Smooth, restrained interactions consistent with `DESIGN.md`.
- Desktop window resizing should remain usable.

Explicit exclusions:

- no SQLite
- no Tiptap
- no real local image import
- no autosave
- no pagination engine
- no page-flip dependency
- no Three.js / React Three Fiber
- no auth/cloud

Dependency discipline:

- Install only packages that Phase 1 actually needs.
- Before adding a package, verify whether the current scaffold/dependencies already solve the problem.

After implementation:

1. Inspect project scripts/config.
2. Run relevant typecheck/build/lint/test commands that exist.
3. Fix errors introduced by this work.
4. Do not claim success if verification fails.
5. Provide the reporting format required by `AGENTS.md`.
6. Give a short manual click path for the user to test with `npm run tauri dev`.

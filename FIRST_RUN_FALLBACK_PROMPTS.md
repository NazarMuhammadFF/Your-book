# First Run Fallback Prompts

Use this file only if the custom OpenCode commands in `.opencode/commands/` do not appear.

## Prompt 1 — PLAN ONLY

Copy and paste this into OpenCode while using Plan mode:

```text
Read these project files before answering:
AGENTS.md, PRD.md, DESIGN.md, ARCHITECTURE.md, ROADMAP.md, CURRENT_PHASE.md, and DECISIONS.md.

Inspect the existing repository. Do not edit any files yet.

Create a concrete implementation plan for ONLY the phase marked active in CURRENT_PHASE.md.

Your plan must include:
1. What currently exists in the repo.
2. Exact active-phase scope.
3. Files/modules you expect to create or change.
4. Dependencies required now and why.
5. Implementation order.
6. Verification commands.
7. Risks or uncertainties.
8. Explicit features that will remain deferred.

Do not implement anything yet.
```

## Prompt 2 — BUILD PHASE 1

Use this only after reviewing the plan and confirming `CURRENT_PHASE.md` still says Phase 1:

```text
Read AGENTS.md, PRD.md, DESIGN.md, ARCHITECTURE.md, ROADMAP.md, CURRENT_PHASE.md, and DECISIONS.md again.

Implement ONLY Phase 1 — Navigable UI Foundation from ROADMAP.md.

Required:
- Library screen with bookshelf prototype.
- Reusable Book component prepared for later CSS 3D enhancement.
- Several tasteful mock books.
- Create Book screen with book preview and basic local form controls.
- Book Workspace shell.
- Document View / Book View placeholder toggle.
- Working navigation and back flow.
- Centralized semantic design tokens.
- Centralized smooth motion presets.
- Desktop-resizable layout.

The experience should follow DESIGN.md: Calm — Tactile — Playful, smooth but not childish.

Do NOT implement SQLite, Tiptap, real image import, autosave, pagination, page flip, Three.js, authentication, or cloud features.

Install only dependencies actually required for Phase 1.

After implementation, run the relevant verification commands available in the project, fix errors caused by your work, and report:
- Implemented
- Important files
- Verification
- Known limitations
- Manual click path to test using npm run tauri dev
```

## Prompt 3 — FIX A BUILD FAILURE

```text
Read AGENTS.md and inspect the current repository. The project currently fails to build/run.
Diagnose the actual error first. Make the smallest change necessary to restore the intended current-phase behavior.
Do not add features and do not advance the roadmap.
Run the relevant verification commands again and report the result.
```

## Prompt 4 — SMALL VISUAL REVISION

```text
Read DESIGN.md and CURRENT_PHASE.md first.
Improve only the following visual issue while preserving the current architecture and behavior:

[WRITE THE PROBLEM HERE]

Prefer a small targeted change. Reuse centralized design and motion tokens. Do not implement future roadmap features.
```

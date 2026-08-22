# BookNote — OpenCode Agent Instructions

## Read first

Before architectural or feature work, read these files in this order:

1. `PRD.md`
2. `DESIGN.md`
3. `ARCHITECTURE.md`
4. `ROADMAP.md`
5. `CURRENT_PHASE.md`
6. `DECISIONS.md`

Treat them as project requirements. If code and documentation conflict, call out the conflict instead of silently changing product decisions.

## Scope discipline

- Implement only the phase marked active in `CURRENT_PHASE.md`.
- Do not implement future roadmap phases "while you're here".
- Do not add cloud, auth, AI writing, advanced 3D, or other unrequested features.
- When a task is ambiguous, prefer the simplest implementation consistent with the current phase.

## Coding rules

- Use TypeScript strict typing.
- Avoid `any`. If unavoidable, document the reason and keep its scope small.
- Keep components focused and reasonably sized.
- Prefer feature-oriented modules over one large `components` folder.
- Do not put persistence/SQL directly in React presentation components.
- Do not duplicate document content between Document View and Book View.
- Centralize reusable design tokens and motion presets.
- Avoid arbitrary animation values repeated across components.
- Keep third-party page-flip integration behind an adapter when that phase begins.
- Keep pagination logic independent from flip animation and Tiptap editor internals.

## Dependency rules

- Do not install a dependency only because it may be useful later.
- Install dependencies when the active phase needs them.
- Before adding a significant dependency, briefly state why native/current dependencies are insufficient.
- Prefer maintained, well-scoped packages.

## UI rules

The product personality is:

**Calm — Tactile — Playful**

- Smooth, subtle motion.
- Avoid stiff instant transitions for meaningful object changes.
- Avoid childish bounce/excessive effects.
- Avoid Word-like permanent toolbar clutter.
- Use semantic design tokens rather than locking final branding into random component values.
- Preserve responsiveness for resizable desktop windows.
- Respect reduced motion when practical.

## Safety for user data

When persistence begins:

- Never intentionally destroy or overwrite user content without a clear requested action.
- Use database migrations.
- Avoid destructive migration shortcuts.
- Handle failed saves/imports visibly.

## Verification

After a meaningful implementation:

1. Inspect available scripts in `package.json` and project config.
2. Run the relevant typecheck/build/lint/test commands that exist.
3. Fix errors caused by the change.
4. Do not claim success if checks fail.
5. Report remaining warnings or limitations.

For Tauri UI changes, also ensure the app can still be launched with the project's Tauri development command when environment permits.

## Reporting format after implementation

Provide a concise report with:

### Implemented
- Main features/changes.

### Important files
- Key files created/changed and why.

### Verification
- Commands run and their outcome.

### Known limitations
- Anything intentionally deferred to later phases.

### Suggested manual check
- A short click path the user can test in the running app.

## Git behavior

- Do not rewrite Git history.
- Do not force push.
- Do not delete unrelated user work.
- Prefer small coherent changes.
- Do not create a commit unless the user asks or existing workflow clearly requires it.

## About `/init`

This repository already has a manually curated `AGENTS.md`. If OpenCode `/init` is run later, preserve the product and architecture rules above. Generated build/test guidance may be added, but do not remove the manual requirements.

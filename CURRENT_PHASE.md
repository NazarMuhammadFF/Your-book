# Current Development Phase

## ACTIVE: Phase 1.5 — Interactive Page-Flip Prototype

Phase 1 UI foundation has been visually established. OpenCode must currently implement
**Phase 1.5 only** from `ROADMAP.md`.

## Goal

Validate the tactile reading interaction before persistence work by adding an interactive,
replaceable page-flip prototype to the existing mock-data Book View.

## Must deliver

- Direct mouse-drag page folding and turning in Book View.
- Forward and backward two-page navigation with deterministic mock pages.
- A `BookFlipAdapter` boundary around the selected page-flip engine.
- Previous/Next and keyboard navigation fallbacks.
- Current reader position preserved across Document/Book view switches.
- Reduced-motion fallback without interactive flip animation.
- Lifecycle-safe cleanup and responsive layout updates.
- Successful build/typecheck according to project scripts.

## Must NOT deliver yet

- SQLite.
- Tiptap.
- File/image import.
- Autosave.
- Pagination engine.
- Dynamic or production pagination.
- Three.js.
- Authentication/cloud.

## Completion note

This is an intentional roadmap exception for product validation. It does not move SQLite,
Tiptap, persistence, or production pagination forward. Do not automatically advance this
file to Phase 2; the user will visually evaluate Phase 1.5 first.

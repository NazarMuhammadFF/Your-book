# BookNote Development Roadmap

## How to use this roadmap

Only implement the current phase from `CURRENT_PHASE.md` unless the user explicitly advances the project.

A phase is complete only when:

- Its listed acceptance criteria are met.
- The app builds/typechecks using the commands available in the project.
- Existing working behavior is not broken.
- OpenCode reports what changed.
- The user has a chance to visually evaluate relevant UI.

---

# Phase 0 — Environment & Scaffold

Status: manual setup / prerequisite

- [ ] Node.js LTS available.
- [ ] Rust stable MSVC available on Windows.
- [ ] Microsoft C++ Build Tools installed with Desktop development with C++.
- [ ] WebView2 available.
- [ ] Git available (strongly recommended).
- [ ] OpenCode available and provider configured.
- [ ] Tauri 2 + React + TypeScript project scaffold runs.
- [ ] Project instruction files copied to root.

Acceptance:

```text
npm run tauri dev
```

opens the starter Tauri application successfully.

---

# Phase 1 — Navigable UI Foundation

**CURRENT INITIAL DEVELOPMENT TARGET**

Goal: create a visual vertical slice with mock data. No persistence/editor/page-flip yet.

### Tasks

- [ ] Establish feature-oriented frontend structure.
- [ ] Add routing/navigation appropriate for desktop app.
- [ ] Create semantic design tokens.
- [ ] Create centralized motion presets.
- [ ] Build Library screen.
- [ ] Build Bookshelf prototype capable of multiple shelf rows.
- [ ] Build reusable Book visual component prepared for later CSS 3D enhancement.
- [ ] Provide several mock books with varied title/cover appearance.
- [ ] Build New Book / Create Book screen.
- [ ] Create live-ish book preview using local form state.
- [ ] Include basic fields: title, cover choice placeholder, typography controls placeholder.
- [ ] Build Book Workspace shell.
- [ ] Add Document View / Book View toggle.
- [ ] Use placeholder content for both views.
- [ ] Clicking a book opens workspace.
- [ ] New Book action opens Create Book screen.
- [ ] Back/close returns to Library.
- [ ] Add subtle motion for key screen/book interactions.
- [ ] Ensure desktop window resizing does not catastrophically break layout.

### Explicitly excluded

- SQLite.
- Tiptap.
- Real image import.
- Real autosave.
- Automatic pagination.
- Page-flip library.
- Three.js / React Three Fiber.
- Cloud/auth.

### Acceptance criteria

A developer can run the app and perform:

```text
Library
 -> Create Book screen
 -> return
 -> click mock book
 -> Workspace
 -> toggle Document / Book placeholder
 -> return Library
```

UI should already communicate `Calm — Tactile — Playful` even though details are not final.

---

# Phase 1.5 — Interactive Page-Flip Prototype

**CURRENT PRODUCT-VALIDATION TARGET**

Goal: validate direct, tactile page dragging in the existing mock-data Book View before
persistence and editor work begins.

### Tasks

- [ ] Derive several deterministic reader pages from the shared mock document source.
- [ ] Preserve the approved two-page physical Book View appearance.
- [ ] Introduce a replaceable `BookFlipAdapter` boundary.
- [ ] Integrate direct StPageFlip behind the adapter only.
- [ ] Support corner preview, continuous drag folding, snap-back, and completed turns.
- [ ] Support forward/backward navigation and first/final boundaries.
- [ ] Add Previous/Next buttons and Arrow Left/Right keyboard navigation.
- [ ] Preserve reader position across Document/Book view switches.
- [ ] Add a reduced-motion static spread fallback.
- [ ] Verify lifecycle cleanup under React Strict Mode and repeated remounts.
- [ ] Update layout responsively without recreating the engine on ordinary resize.

### Explicitly excluded

- SQLite and persistence.
- Tiptap and document editing.
- Automatic or production pagination.
- Real image import.
- Three.js / React Three Fiber / WebGL.
- Cloud/auth.

### Acceptance criteria

The user can directly drag pages forward and backward through several mock spreads, cancel
a partial drag, use keyboard/button fallbacks, resize the desktop window, switch views
without losing position, and repeatedly remount Book View without stale callbacks or
obvious accumulating render work.

This phase intentionally prototypes part of the original Phase 6 interaction early. Phase 6
still owns production Book View integration with real pagination output.

---

# Phase 2 — Local Book Persistence

Goal: books survive app restart.

- [ ] Install/configure SQLite through appropriate Tauri integration.
- [ ] Add migration system.
- [ ] Add books table.
- [ ] Add documents table with one document per book.
- [ ] Repository layer.
- [ ] Create book persists.
- [ ] Update book settings persists.
- [ ] Delete book flow with confirmation.
- [ ] Library loads real books.
- [ ] Create initial empty document when a book is created.
- [ ] Handle database errors sensibly.

Acceptance:

Create book → restart app → book remains.

---

# Phase 3 — Rich Text Document Editor

Goal: Document View becomes useful for writing.

- [ ] Integrate Tiptap.
- [ ] Structured document JSON.
- [ ] Title/headings/paragraphs.
- [ ] Bold/italic/underline/strike/highlight.
- [ ] Lists/checklist/quote/divider.
- [ ] Minimal/contextual formatting UI.
- [ ] Load saved content.
- [ ] Autosave with debounce and clear saving state.
- [ ] Protect against data loss during navigation.

Acceptance:

Write formatted document → close/reopen book → content remains.

---

# Phase 4 — Image Blocks & Asset Management

Goal: images are first-class structured content.

- [ ] Import local image.
- [ ] Copy/manage file in stable app-controlled location when necessary.
- [ ] Tiptap custom image node / node view.
- [ ] Center layout.
- [ ] Full-width layout.
- [ ] Left wrap.
- [ ] Right wrap.
- [ ] Image selection controls.
- [ ] Missing asset fallback.
- [ ] Avoid absolute freeform positioning.

Acceptance:

Insert image → change layout → surrounding content stays structured → reopen → image remains.

---

# Phase 5 — Pagination Engine v1

Goal: convert one document into stable pages.

- [ ] Define page metrics.
- [ ] Convert supported document blocks into measurable render representation.
- [ ] Create paginator interface.
- [ ] Basic paragraph/heading pagination.
- [ ] Image page-break rule.
- [ ] Heading orphan prevention rule where practical.
- [ ] Page number mapping.
- [ ] Heading → page mapping.
- [ ] Unit tests for important rules.

Acceptance:

Same document/settings produces a stable ordered page list without visibly clipping key blocks.

---

# Phase 6 — Book View & Page Flip

Goal: real book reading experience.

- [ ] Build polished two-page spread renderer.
- [ ] Add gutter/paper/page depth styling.
- [ ] Introduce `BookFlipAdapter`.
- [ ] Integrate chosen flip implementation only inside adapter boundary.
- [ ] Next/previous navigation.
- [ ] Drag/click flip behavior.
- [ ] Page number state.
- [ ] Reduced-motion fallback if needed.
- [ ] Book View uses pagination output, never separate content.

Acceptance:

Switch Document → Book → flip through the same saved content reliably.

---

# Phase 7 — Bookshelf CSS 3D & Transitions

Goal: elevate tactile identity after core functionality is stable.

- [ ] Add front/spine/page block depth to Book component.
- [ ] Use custom cover texture.
- [ ] Improve shelf depth/shadows.
- [ ] Book hover/selection motion.
- [ ] Focus/open transition.
- [ ] Close/return transition.
- [ ] Performance review with many books.

Only evaluate Three.js if CSS 3D demonstrably cannot satisfy the desired experience.

---

# Phase 8 — Book Customization Polish

- [ ] Better generated default covers.
- [ ] Custom image crop/reposition.
- [ ] Show/hide title overlay.
- [ ] Font selection polish.
- [ ] Page/margin presets.
- [ ] Preview improvements.
- [ ] Book thickness/visual variants if useful.

---

# Phase 9 — Navigation & Reading Enhancements

- [ ] Auto table of contents from headings.
- [ ] Navigate heading in Document View.
- [ ] Navigate heading → page in Book View.
- [ ] Search within current book.
- [ ] Optional bookmarks/favorites.

---

# Phase 10 — Reliability, Backup & Packaging

- [ ] Export/backup strategy.
- [ ] Import/restore strategy.
- [ ] Database migration resilience.
- [ ] Larger-document performance checks.
- [ ] Missing asset cleanup/recovery.
- [ ] Windows packaging.
- [ ] Application icon/metadata.
- [ ] Release build verification.

---

# Future ideas — NOT V1 commitments

- Multiple sections/entries inside a book.
- Multiple shelves/categories.
- Optional ambient/page-turn sounds.
- Themes.
- Cloud sync.
- Cross-device sync.
- Mobile companion.
- AI-assisted writing.
- Collaboration.

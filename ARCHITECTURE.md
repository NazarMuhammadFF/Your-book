# BookNote Technical Architecture

## 1. Proposed stack

Initial technical direction:

- **Desktop shell:** Tauri 2
- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS (or equivalent utility setup if scaffold/version requires adjustment)
- **Motion:** Motion for React
- **Editor:** Tiptap
- **Local database:** SQLite through supported Tauri integration
- **Client UI state:** Zustand
- **Icons:** Lucide React
- **Book illusion:** CSS 3D first
- **Page flip:** replaceable adapter around a page-flip implementation
- **Advanced WebGL / React Three Fiber:** only if CSS approach is proven insufficient

Dependencies should only be installed when their roadmap phase starts.

---

## 2. Architectural principles

1. **One document source of truth.**
   - Document View and Book View consume the same structured content.

2. **Feature boundaries.**
   - Library, books, editor, reader, and persistence should not become one giant component tree.

3. **Visual systems are replaceable.**
   - Page flip implementation must sit behind an adapter.
   - Bookshelf rendering should not own book persistence.

4. **Pagination is a subsystem.**
   - It must be testable independently from the flip animation.

5. **Persistence is not UI state.**
   - Database repositories/services should isolate SQLite details from React components.

6. **Local assets have a clear lifecycle.**
   - Imported cover/document images should use a stable app-managed path/asset strategy.

7. **Do not optimize prematurely.**
   - CSS 3D before Three.js.
   - Mock data before SQLite in Phase 1.

---

## 3. Target source layout

Exact filenames can evolve, but preserve these feature boundaries:

```text
src/
├── app/
│   ├── router/
│   └── providers/
│
├── features/
│   ├── library/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── types/
│   │
│   ├── books/
│   │   ├── components/
│   │   ├── services/
│   │   └── types/
│   │
│   ├── editor/
│   │   ├── components/
│   │   ├── extensions/
│   │   └── nodes/
│   │
│   └── reader/
│       ├── pagination/
│       ├── renderers/
│       ├── flip/
│       └── components/
│
├── database/
│   ├── migrations/
│   ├── repositories/
│   └── database.ts
│
├── components/
│   └── ui/
│
├── design/
│   ├── motion.ts
│   ├── tokens.ts
│   └── typography.ts
│
├── lib/
├── assets/
└── main.tsx
```

Do not create empty folders just to match this diagram. Add them when the corresponding feature begins.

---

## 4. Core domain model

### Book

Conceptual TypeScript shape:

```ts
interface Book {
  id: string;
  title: string;
  cover: BookCover;
  typography: BookTypography;
  pageSettings: BookPageSettings;
  createdAt: string;
  updatedAt: string;
}
```

### BookCover

```ts
type BookCover =
  | {
      type: 'default';
      background: string;
      titleVisible: boolean;
    }
  | {
      type: 'image';
      assetPath: string;
      fit: 'cover' | 'contain';
      titleVisible: boolean;
    };
```

This shape is conceptual; adapt it once persistence is introduced.

### BookTypography

Should eventually represent:

- font family
- base font size
- line height
- paragraph spacing
- text alignment

### Document

```ts
interface BookDocument {
  id: string;
  bookId: string;
  content: unknown; // becomes strongly typed Tiptap JSON representation in editor phase
  createdAt: string;
  updatedAt: string;
}
```

Avoid leaving `unknown`/`any` once the real editor schema is introduced.

---

## 5. Rendering flow

```text
Persistent Document Content
          │
          ▼
   Document Domain Model
          │
     ┌────┴───────────┐
     ▼                ▼
Document View     Pagination Engine
                      │
                      ▼
                Paginated Pages
                      │
                      ▼
                 Page Renderer
                      │
                      ▼
                 Flip Adapter
                      │
                      ▼
                  Book View
```

The flip library must never become the source of pagination or document data.

---

## 6. Reader / page-flip abstraction

Desired boundary:

```text
BookView
   ↓
BookPageSpread / PageRenderer
   ↓
BookFlipAdapter
   ↓
Concrete flip implementation
```

Do not import a third-party flip library throughout the app.

If a library is replaced, changes should mostly stay inside `features/reader/flip/`.

---

## 7. Pagination architecture

Pagination will likely be one of the hardest parts.

Keep it separate from animations.

Possible responsibilities:

```text
PaginationInput
- document blocks
- page metrics
- typography metrics

Paginator
- measures / lays out blocks
- applies page-break rules

PaginationOutput
- ordered pages
- block fragments / placements
- heading → page mapping
```

Rules should be explicitly represented and tested.

Examples:

- Don't split an image across pages.
- Prefer heading + following content on same page.
- Preserve block order.
- Make results stable for the same inputs.

Do not attempt full pagination during Phase 1.

---

## 8. Persistence architecture

When persistence phase begins:

```text
React Feature
   ↓
Domain service / hook
   ↓
Repository interface
   ↓
SQLite implementation
```

React components should not contain raw SQL strings.

Planned tables:

### books

- id
- title
- cover metadata
- typography settings
- page settings
- created_at
- updated_at

### documents

- id
- book_id
- content_json
- created_at
- updated_at

Asset metadata can be added when image support starts.

Use migrations from the beginning of the SQLite phase.

---

## 9. State rules

Use local component state for local transient UI.

Use Zustand only for state that genuinely crosses feature/component boundaries, for example:

- selected/open book UI state if router alone is insufficient
- shared view mode
- transient library/workspace state

Do not mirror the entire database into a global store without need.

---

## 10. Design system rules

Centralize:

- semantic colors
- spacing/radius decisions that are reused
- typography roles
- motion durations/springs
- z-index layers if needed

Avoid hard-coded animation timings scattered in JSX.

---

## 11. Error handling

At minimum eventually cover:

- database unavailable/migration failure
- image asset missing
- invalid/corrupted document JSON
- failed image import
- unsupported cover asset

Do not silently destroy or overwrite user content.

---

## 12. Testing priorities

Highest-value tests later:

1. Pagination rules.
2. Repository CRUD and migrations.
3. Document serialization/deserialization.
4. Book settings defaults and validation.
5. Critical navigation/creation flow.

Visual animation details can rely more on manual UI review early on.

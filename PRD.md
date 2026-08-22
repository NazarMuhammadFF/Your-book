# Product Requirements Document — BookNote

## 1. Product summary

**BookNote** adalah aplikasi desktop pencatatan local-first yang menggabungkan kenyamanan editor dokumen modern dengan pengalaman visual perpustakaan dan buku fisik.

Pengguna memiliki kumpulan buku di sebuah **Library / Bookshelf**. Setiap buku dapat dibuat, diberi cover, memiliki pengaturan tipografi sendiri, ditulis melalui **Document View**, dan dibaca melalui **Book View** yang membagi dokumen menjadi halaman dengan efek page flip.

BookNote bukan clone Microsoft Word dan bukan simulasi fisika buku. Fokusnya adalah pengalaman menulis yang clean, personal, smooth, dan menyenangkan.

---

## 2. Product vision

> A calm personal digital library with playful physical interactions.

Tiga prinsip produk:

1. **Calm** — antarmuka tidak ramai dan nyaman untuk sesi menulis panjang.
2. **Tactile** — buku, halaman, gambar, panel, dan transisi terasa memiliki depth dan respons.
3. **Playful** — interaksi memberi kepuasan kecil tanpa terasa seperti game atau UI anak-anak.

---

## 3. Core user journey

```text
Launch app
   ↓
Library / Bookshelf
   ├─ Open existing book
   └─ Create new book
            ↓
       Book Setup
            ↓
       Add to shelf
            ↓
Open Book / Workspace
   ├─ Document View ←→ Book View
   ├─ Write / edit
   └─ Read / flip pages
            ↓
Close book
            ↓
Library
```

---

## 4. V1 functional requirements

### 4.1 Library / Bookshelf

The home screen must:

- Display the user's books on a visually pleasing bookshelf.
- Represent each book as a reusable visual component with apparent depth.
- Support custom cover images and default title-based covers.
- Allow books to have slightly different heights, widths, thicknesses, or rotations while remaining tidy.
- Provide a visible action to create a new book.
- Allow clicking an existing book to open it.
- Provide subtle hover/tap feedback.
- Be able to vertically expand to multiple shelves as the number of books grows.

V1 may begin with CSS 2D/3D illusion. Full WebGL/Three.js is not required.

### 4.2 Create Book

Creating a book must support:

- Book title.
- Cover mode:
  - Default cover generated from style + title.
  - Imported custom image.
- Custom cover image should support at least sensible `fill/crop` behavior. Advanced cover editor can come later.
- Default typography:
  - Font family.
  - Font size.
  - Line height.
  - Paragraph spacing.
  - Text alignment.
- Page appearance settings:
  - Page margin.
  - Page size/preset can be introduced later if not required by initial pagination implementation.
- Live preview is desirable once the core form works.

### 4.3 Book Workspace

Opening a book enters a workspace belonging to that book.

The workspace must eventually contain two representations of **the same document**:

1. **Document View** — continuous vertical document optimized for writing.
2. **Book View** — paginated visual representation optimized for reading.

There must never be two separate content sources for these views.

### 4.4 Document View

Document View is the primary writing mode.

V1 editor requirements after editor phase:

- Title.
- Heading 1.
- Heading 2.
- Heading 3.
- Paragraph.
- Bold.
- Italic.
- Underline.
- Strike.
- Highlight.
- Bullet list.
- Numbered list.
- Checklist.
- Quote.
- Divider.
- Image.

The editor should not permanently show a large Word-like toolbar. Prefer contextual or compact controls.

### 4.5 Images inside documents

Images must participate in document flow and not use unrestricted absolute x/y positioning.

Planned image layout modes:

- Center.
- Full width.
- Left with text wrap.
- Right with text wrap.

Optional later:

- Caption.
- Size presets.
- Crop/focal point.

The layout must remain stable when content above the image changes.

### 4.6 Book View

Book View must:

- Render the same document used in Document View.
- Divide content into pages.
- Present a two-page book spread on suitable desktop widths.
- Include left/right page numbers where appropriate.
- Provide a page-flip interaction.
- Avoid cutting images across pages.
- Avoid orphaned headings when practical.
- Keep a page-flip library behind an adapter abstraction so it can be replaced.

The target is **stylized realism**, not expensive physical simulation.

### 4.7 Automatic pagination

Pagination is a dedicated subsystem, not a side effect of CSS overflow.

It should eventually consider:

- Page dimensions.
- Margins.
- Font family and size.
- Line height.
- Paragraph spacing.
- Heading blocks.
- Image dimensions/layout.
- Lists and quotes.

Rules:

- An image should move to the next page if it cannot fit sensibly.
- A heading should preferably stay with some following content.
- Page rendering must be deterministic for the same content/style/window conditions.

### 4.8 Table of contents

Headings should be semantic rather than manually styled paragraphs so a table of contents can later be generated automatically.

A future TOC can navigate to:

- A heading in Document View.
- The page containing that heading in Book View.

### 4.9 Local persistence

V1 is local-first.

Planned persistence:

- SQLite database for structured data.
- Local filesystem/app data for imported images if more appropriate than database blobs.
- Autosave after editor phase.

No cloud account is required for V1.

---

## 5. Data concept

The initial model is intentionally simple:

```text
Book
 └─ Document (one primary document in V1)
      └─ structured content blocks
```

A book contains one long document in V1. Chapters/entries/sections may later be layered on top without changing the core rule that Document View and Book View share one content source.

Expected entities:

### Book

- id
- title
- coverType
- coverPath / cover metadata
- cover styling
- default typography
- page settings
- createdAt
- updatedAt

### Document

- id
- bookId
- contentJson
- createdAt
- updatedAt

### Asset / Attachment (later)

- id
- documentId/bookId as appropriate
- path
- type
- metadata

---

## 6. Non-functional requirements

### Performance

- App interactions should feel responsive on a normal modern Windows laptop.
- Avoid loading advanced 3D/WebGL unless proven necessary.
- Avoid rendering all pages or all heavy editors when not needed.
- Large images should be handled sensibly.

### Motion

- Motion must communicate state changes.
- Motion should not block normal writing actions.
- Respect `prefers-reduced-motion` where practical.

### Reliability

- User content must not be lost because of a visual transition.
- Persistence and rendering concerns must remain separated.
- The app should fail gracefully if a custom cover or image asset is missing.

### Maintainability

- Feature-based architecture.
- Strict TypeScript.
- Page flip implementation behind an adapter.
- Pagination logic isolated and testable.
- Design/motion tokens centralized.

---

## 7. V1 non-goals

Do **not** add these unless the roadmap is explicitly updated:

- Cloud sync.
- User accounts/authentication.
- Collaboration/multi-user editing.
- AI writing features.
- Mobile app.
- Browser/web deployment.
- Full 3D room/environment.
- Multiplayer/social sharing.
- Calendar/task-management suite.
- Plugin marketplace.
- Complex freeform canvas.
- Handwritten ink system.

---

## 8. Success criteria for first usable V1

A user can:

1. Launch the desktop app.
2. See their Library.
3. Create a book and choose a title/cover/basic typography.
4. See the new book on the shelf after restart.
5. Open the book.
6. Write formatted text and insert images.
7. Switch between Document View and Book View without duplicated content.
8. Flip through generated pages.
9. Close the book and return to Library.
10. Experience interactions that feel smooth and cohesive.

---

## 9. Product decisions that must not be silently changed

- Document View and Book View share one content source.
- Document View is optimized for writing; Book View is optimized for reading.
- Images stay in document flow rather than arbitrary x/y placement.
- Local-first for V1.
- CSS 3D is preferred before Three.js.
- Page flip must be replaceable behind an adapter.
- Pagination is a dedicated module.
- Design is iterated in code; a finalized Figma file is not required before development.

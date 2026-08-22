# BookNote Architecture & Product Decisions Log

This file records decisions that should not be casually reversed by a coding agent.

## D-001 — Desktop technology

**Decision:** Start with Tauri 2 + React + TypeScript.

**Reason:** Desktop-local experience, native packaging, web UI flexibility, and a practical path to SQLite/local filesystem integration.

---

## D-002 — Local-first V1

**Decision:** No authentication or cloud requirement in V1.

**Reason:** Keep the first product focused and reliable. Notes/books should work offline.

---

## D-003 — Single content source

**Decision:** Document View and Book View use the same structured document data.

**Reason:** Prevent synchronization bugs and duplicated content.

---

## D-004 — Writing vs reading modes

**Decision:** Document View is primary for writing; Book View is primary for tactile reading.

**Reason:** Continuous editing is more comfortable than editing directly inside page-turn constraints.

---

## D-005 — Images remain in document flow

**Decision:** Images use structured alignment/layout modes, not arbitrary free x/y positioning.

**Reason:** Maintain stable, predictable documents and pagination.

---

## D-006 — CSS 3D before WebGL

**Decision:** Build books/bookshelf with CSS depth/perspective before considering Three.js.

**Reason:** Lower complexity and resource usage; advanced 3D is only justified if CSS cannot achieve the desired visual result.

---

## D-007 — Page flip behind adapter

**Decision:** No third-party flip library should leak across the reader feature.

**Reason:** Page-flip packages may have rendering/mobile/lifecycle limitations. A replaceable adapter reduces lock-in.

---

## D-008 — Dedicated pagination module

**Decision:** Pagination is separate from page-flip animation and from the editor.

**Reason:** It is complex domain logic that requires isolated testing and predictable output.

---

## D-009 — Design-in-code

**Decision:** Development does not wait for a finalized Figma design.

**Reason:** The user wants rapid project progress and will evaluate design iteratively. Architecture and design tokens must make visual revision inexpensive.

---

## D-010 — Phase-by-phase agent scope

**Decision:** OpenCode must not implement future roadmap phases without explicit user direction.

**Reason:** Prevent AI agents from adding premature complexity and dependencies.

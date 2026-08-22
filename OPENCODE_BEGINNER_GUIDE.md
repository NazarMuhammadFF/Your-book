# OpenCode Beginner Guide for BookNote — Windows

This guide assumes you are building the Windows desktop version first and are still learning OpenCode.

Official references:

- OpenCode: https://opencode.ai/docs
- OpenCode commands: https://opencode.ai/docs/commands/
- Tauri prerequisites: https://v2.tauri.app/start/prerequisites/
- Tauri create project: https://v2.tauri.app/start/create-project/

---

# PART A — One-time prerequisites

## A1. Node.js

Install the current **Node.js LTS** release.

Then open a new PowerShell window and check:

```powershell
node -v
npm -v
```

Both should print a version.

## A2. Microsoft C++ Build Tools

Tauri on Windows requires Microsoft's C++ build tools.

Install **Microsoft C++ Build Tools / Visual Studio Build Tools** and select:

```text
Desktop development with C++
```

Keep the recommended components selected.

## A3. WebView2

Modern Windows normally already includes WebView2. If Tauri reports it missing, install Microsoft Edge WebView2 Runtime.

## A4. Rust

A simple Windows installation option is:

```powershell
winget install --id Rustlang.Rustup
```

Restart PowerShell, then check:

```powershell
rustc --version
cargo --version
```

If necessary for Windows Tauri development:

```powershell
rustup default stable-msvc
```

## A5. Git — strongly recommended

Check:

```powershell
git --version
```

Git gives you a safety point before AI-generated changes. If a future OpenCode edit goes wrong, having commits makes recovery much easier.

## A6. OpenCode

One supported native Windows option is npm:

```powershell
npm install -g opencode-ai
```

Check:

```powershell
opencode --version
```

> OpenCode documentation generally recommends WSL on Windows. For this project, native PowerShell is intentionally used first because the Windows Tauri toolchain already depends on native MSVC/C++ build tools. Do not mix Windows and WSL workflows until you are comfortable with the setup.

---

# PART B — Create the Tauri project

Do this **before extracting the BookNote starter documents into the project**.

Choose a parent folder, for example:

```powershell
cd D:\Projects
```

Create the app:

```powershell
npm create tauri-app@latest
```

When asked, choose approximately:

```text
Project name: booknote
Identifier: com.booknote.app
Frontend language: TypeScript / JavaScript
Package manager: npm
UI template: React
UI flavor: TypeScript
```

The wording may change slightly between versions; the important choices are **React + TypeScript + npm**.

Then:

```powershell
cd booknote
npm install
npm run tauri dev
```

A Tauri window should open.

If this step fails, solve the environment error **before asking OpenCode to build the product**.

---

# PART C — Copy this starter pack into the project

Extract `BookNote_OpenCode_Starter.zip`.

Copy **the contents** of its folder into the root of the Tauri project.

Correct result:

```text
booknote/
├── src/
├── src-tauri/
├── package.json
├── AGENTS.md
├── PRD.md
├── DESIGN.md
├── ARCHITECTURE.md
├── ROADMAP.md
├── CURRENT_PHASE.md
├── DECISIONS.md
├── 00_START_HERE.md
├── OPENCODE_BEGINNER_GUIDE.md
└── .opencode/
    └── commands/
```

Do **not** create this accidental nesting:

```text
booknote/BookNote_OpenCode_Starter/PRD.md
```

The `.md` files should be next to `package.json`.

---

# PART D — Make a safety snapshot with Git

From the project root:

```powershell
git init
git add .
git commit -m "chore: initial Tauri scaffold and BookNote project docs"
```

If Git asks for your name/email, configure them according to Git's prompt and repeat the commit.

Why do this?

Because you now have a clean point to return to if an agent makes a bad change.

---

# PART E — First OpenCode session

From the project root:

```powershell
opencode
```

If your LLM/provider is not configured yet, use OpenCode's connection flow:

```text
/connect
```

Follow the provider authentication shown by OpenCode.

## Important: you already have AGENTS.md

OpenCode normally offers `/init` to create/update `AGENTS.md` after scanning a repository.

This starter pack already supplies a curated `AGENTS.md`, so **do not run `/init` at the very beginning**. The instructions already tell OpenCode what this product is.

After Phase 1, `/init` may optionally be used to enrich repository-specific build/test guidance, but preserve the manual rules already in `AGENTS.md` and review the diff afterward.

---

# PART F — Ask OpenCode to plan before coding

Inside OpenCode run:

```text
/project-plan
```

This custom command is included in `.opencode/commands/project-plan.md` and uses the planning agent.

Expected behavior:

- Read the project docs.
- Inspect the scaffold.
- Explain how it will implement Phase 1.
- Mention files/dependencies it expects to change.
- **Not edit code yet.**

Read the plan.

You do not need to understand every technical detail. Check these simple things:

- Does it say it is doing **Phase 1 only**?
- Does it avoid SQLite/Tiptap/page flip/Three.js?
- Does it include Library + Create Book + Workspace?
- Does it mention smooth motion/design tokens?

If yes, continue.

---

# PART G — Let OpenCode implement Phase 1

Run:

```text
/phase-1
```

This tells OpenCode to:

- Read the requirements again.
- Implement the active phase.
- Run available verification commands.
- Report what it changed.

Do not interrupt just because it creates multiple files. Look for actual errors or a plan that clearly leaves the requested scope.

---

# PART H — Run the result yourself

After OpenCode finishes, use a PowerShell terminal in the project root:

```powershell
npm run tauri dev
```

You should be able to test approximately:

```text
Library
 -> click + New Book
 -> Create Book screen
 -> back
 -> click a mock book
 -> Book Workspace
 -> toggle Document / Book
 -> back to Library
```

At this point, visual imperfections are expected. Phase 1 is for the real foundation and navigation.

Take screenshots of anything you want to change visually.

---

# PART I — Useful custom OpenCode commands included

## `/project-plan`

Read the project and produce a plan for the currently active phase without editing.

## `/phase-1`

Implement Phase 1 only.

## `/status`

Ask OpenCode to inspect the repository and tell you what appears complete/incomplete compared with the current phase.

## `/verify`

Run available verification commands and diagnose failures. It should not add new features.

## `/ui-review`

Review the current UI implementation against `DESIGN.md` and provide prioritized improvements without silently starting future functional phases.

---

# PART J — How to talk to OpenCode after the first build

You do not have to use technical language.

Good prompts:

```text
Di Library, buku terasa terlalu kecil dan rak terlalu kosong. Improve visual hierarchy while preserving the current architecture and Phase 1 scope. Read DESIGN.md first.
```

```text
Animasi hover buku terasa terlalu kaku. Make it softer and more tactile using the centralized motion presets. Do not add a new animation library.
```

```text
Create Book screen terlalu seperti form admin. Improve it so the book preview is the visual focus and settings feel secondary. Keep existing behavior.
```

```text
Before changing anything, explain why the workspace layout feels crowded and propose a small fix.
```

The agent can understand Indonesian, but keeping important technical file names/constraints exactly written is helpful.

---

# PART K — When something goes wrong

## K1. App no longer builds

Run inside OpenCode:

```text
/verify
```

Or tell it:

```text
The project stopped building after the last change. Diagnose the actual error, make the smallest fix necessary, and do not add features.
```

## K2. UI became worse

Do not ask it to rewrite the whole project.

Say specifically what changed:

```text
The previous bookshelf spacing was better. Revert only the bookshelf spacing/layout changes from your last edit while preserving the other working changes.
```

OpenCode also has built-in `/undo` and `/redo` commands, but Git commits remain the safest clear checkpoints for a beginner.

## K3. Agent starts making future features

Stop it and say:

```text
Stop. Read CURRENT_PHASE.md. Do not implement anything outside the active phase. Re-evaluate your current changes against the roadmap.
```

## K4. You are unsure whether a dependency is needed

Ask:

```text
Do not install it yet. Explain what problem this dependency solves, what built-in/current alternatives exist, and whether it is required in the active phase.
```

---

# PART L — Suggested working rhythm

For each phase:

```text
1. Update CURRENT_PHASE.md only when we decide to advance.
2. /project-plan
3. Review plan.
4. Build command / focused implementation prompt.
5. /verify
6. npm run tauri dev
7. Visually test.
8. Fix small problems.
9. Git commit when satisfied.
10. Advance to next phase only after review.
```

This rhythm is intentionally slower than asking an agent to build the entire app at once, but it is much faster than repairing an uncontrolled AI-generated codebase later.

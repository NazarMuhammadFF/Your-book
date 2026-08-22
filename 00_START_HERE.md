# BookNote — START HERE

> Paket arahan project untuk membangun aplikasi pencatatan berbasis buku digital dengan OpenCode.
> Last updated: 22 August 2026.

## Tujuan paket ini

File-file di folder ini adalah **sumber konteks untuk OpenCode**. Jangan menjelaskan ulang keseluruhan aplikasi setiap kali membuka sesi baru. OpenCode harus membaca dokumen-dokumen ini sebelum membuat perubahan besar.

## Urutan yang harus dibaca

1. `PRD.md` — apa yang harus dibuat.
2. `DESIGN.md` — bagaimana aplikasi harus terasa dan terlihat.
3. `ARCHITECTURE.md` — bagaimana project harus disusun secara teknis.
4. `ROADMAP.md` — urutan pengerjaan.
5. `CURRENT_PHASE.md` — apa yang boleh dikerjakan sekarang.
6. `AGENTS.md` — aturan permanen untuk coding agent.
7. `DECISIONS.md` — keputusan arsitektur yang sudah dikunci.
8. `OPENCODE_BEGINNER_GUIDE.md` — langkah penggunaan OpenCode untuk pemula.

## Konsep singkat aplikasi

BookNote adalah aplikasi desktop **local-first** untuk menulis catatan dalam bentuk buku digital.

Pengalaman utama:

`Library / Bookshelf -> pilih atau buat buku -> Document View untuk menulis -> Book View untuk membaca seperti buku -> flip halaman -> kembali ke Library.`

Aplikasi harus terasa:

**Calm — Tactile — Playful**

Smooth, tidak kaku, tetapi juga tidak childish atau penuh animasi yang tidak perlu.

## Yang dikerjakan pertama

Saat pertama memulai development, kerjakan **Phase 1 saja** dari `ROADMAP.md`.

Target Phase 1 adalah vertical slice UI yang sudah bisa dijalankan:

- Library screen.
- Bookshelf prototype.
- Reusable Book component.
- Create Book screen.
- Book Workspace.
- Document/Book View switch sebagai placeholder.
- Navigasi berfungsi.
- Motion system dasar.
- Mock data saja.

**Jangan memasang SQLite, Tiptap, page-flip, atau advanced 3D pada Phase 1.**

## Cara termudah menjalankan OpenCode

Setelah project Tauri + React selesai dibuat dan paket ini disalin ke root project:

```powershell
cd path\ke\project
opencode
```

Di OpenCode jalankan:

```text
/project-plan
```

Setelah plan masuk akal, jalankan:

```text
/phase-1
```

Kemudian keluar/biarkan OpenCode dan tes app:

```powershell
npm run tauri dev
```

Panduan lengkap ada di `OPENCODE_BEGINNER_GUIDE.md`.

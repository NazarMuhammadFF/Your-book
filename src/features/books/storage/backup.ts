import type { Book } from "../types/book";
import type { BookPlacement } from "../../library/utils/shelfLayout";
import { CURRENT_SCHEMA_VERSION } from "./bookStorage";

const BACKUP_APP_ID = "booknote-backup";

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  schemaVersion: number;
  exportedAt: string;
  books: Book[];
  placements: Record<string, BookPlacement>;
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; message: string };

export interface MergeResult {
  books: Book[];
  placements: Record<string, BookPlacement>;
  added: number;
  skipped: number;
}

export function createBackup(
  books: Book[],
  placements: Record<string, BookPlacement>
): BackupFile {
  return {
    app: BACKUP_APP_ID,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    books,
    placements,
  };
}

export function backupFileName(date = new Date()): string {
  return `booknote-backup-${date.toISOString().slice(0, 10)}.json`;
}

/** Triggers a browser download; works inside the Tauri WebView without extra plugins. */
export function downloadBackup(backup: BackupFile): void {
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = backupFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function looksLikeBook(value: unknown): value is Book {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    isRecord(value.cover) &&
    isRecord(value.typography) &&
    isRecord(value.pageSettings) &&
    isRecord(value.dimensions)
  );
}

export function parseBackup(text: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: "File bukan JSON yang valid." };
  }
  if (!isRecord(parsed) || parsed.app !== BACKUP_APP_ID) {
    return { ok: false, message: "Ini bukan file backup BookNote." };
  }
  if (typeof parsed.schemaVersion !== "number" || parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return {
      ok: false,
      message: "Backup berasal dari versi BookNote yang lebih baru. Perbarui aplikasi dulu.",
    };
  }
  if (!Array.isArray(parsed.books) || !parsed.books.every(looksLikeBook)) {
    return { ok: false, message: "Data buku di dalam backup rusak atau tidak lengkap." };
  }
  const placements = isRecord(parsed.placements)
    ? (parsed.placements as Record<string, BookPlacement>)
    : {};
  return {
    ok: true,
    backup: {
      app: BACKUP_APP_ID,
      schemaVersion: parsed.schemaVersion,
      exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : "",
      books: parsed.books,
      placements,
    },
  };
}

/**
 * Non-destructive restore: only books whose id is not already in the library are added.
 * Existing books and their placements are never replaced.
 */
export function mergeBackup(
  currentBooks: Book[],
  currentPlacements: Record<string, BookPlacement>,
  backup: BackupFile
): MergeResult {
  const existingIds = new Set(currentBooks.map((b) => b.id));
  const incoming = backup.books.filter((b) => !existingIds.has(b.id));
  const placements = { ...currentPlacements };
  for (const book of incoming) {
    if (backup.placements[book.id]) placements[book.id] = backup.placements[book.id];
  }
  return {
    books: [...currentBooks, ...incoming],
    placements,
    added: incoming.length,
    skipped: backup.books.length - incoming.length,
  };
}

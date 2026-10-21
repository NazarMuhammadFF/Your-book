import type { Book } from "../types/book";
import type { BookPlacement } from "../../library/utils/shelfLayout";

/**
 * Single persistence boundary for user library data (books + shelf placements).
 * UI code must not touch localStorage directly; this module is the seam that a
 * future SQLite repository will replace.
 */

// Keys keep their original names so existing user data is picked up unchanged.
const BOOKS_KEY = "booknote_books_v1";
const PLACEMENTS_KEY = "booknote_shelf_placements_v1";
const SCHEMA_VERSION_KEY = "booknote_schema_version";
const CORRUPT_BACKUP_PREFIX = "booknote_corrupt_backup_";

/** Bump when the stored shape of Book/BookPlacement changes, and add a migration. */
export const CURRENT_SCHEMA_VERSION = 1;

export type StorageIssue = { kind: "load" | "save"; message: string };

export type LoadResult<T> = { data: T | null; issue?: StorageIssue };
export type SaveResult = { ok: true } | { ok: false; issue: StorageIssue };

function describe(error: unknown): string {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return "Penyimpanan penuh. Hapus buku atau lampiran besar (mis. PDF) lalu coba lagi.";
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * Keeps a raw copy of unreadable data so a later save cannot silently destroy it.
 */
function backupCorrupt(key: string, raw: string): void {
  try {
    localStorage.setItem(`${CORRUPT_BACKUP_PREFIX}${key}_${Date.now()}`, raw);
  } catch {
    // Backup is best-effort; the load issue is still reported to the user.
  }
}

function loadJson<T>(key: string, isValid: (value: unknown) => value is T): LoadResult<T> {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch (e) {
    return { data: null, issue: { kind: "load", message: describe(e) } };
  }
  if (raw === null) return { data: null };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isValid(parsed)) return { data: parsed };
  } catch {
    // fall through to the corrupt handling below
  }
  backupCorrupt(key, raw);
  return {
    data: null,
    issue: {
      kind: "load",
      message: "Data tersimpan tidak bisa dibaca. Salinan datanya disimpan sebagai cadangan.",
    },
  };
}

function saveJson(key: string, value: unknown): SaveResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
    return { ok: true };
  } catch (e) {
    return { ok: false, issue: { kind: "save", message: describe(e) } };
  }
}

const isBookArray = (value: unknown): value is Book[] => Array.isArray(value);
const isPlacementMap = (value: unknown): value is Record<string, BookPlacement> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** `data: null` means nothing usable is stored (first run, or unreadable data). */
export function loadBooks(): LoadResult<Book[]> {
  return loadJson(BOOKS_KEY, isBookArray);
}

export function saveBooks(books: Book[]): SaveResult {
  return saveJson(BOOKS_KEY, books);
}

export function loadPlacements(): LoadResult<Record<string, BookPlacement>> {
  return loadJson(PLACEMENTS_KEY, isPlacementMap);
}

export function savePlacements(placements: Record<string, BookPlacement>): SaveResult {
  return saveJson(PLACEMENTS_KEY, placements);
}

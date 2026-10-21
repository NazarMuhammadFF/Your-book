import { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import "./App.css";
import { Book } from "./features/books/types/book";
import { INITIAL_MOCK_BOOKS } from "./features/books/mock/mockBooks";
import { AppScreen } from "./types/navigation";
import { LibraryPage } from "./features/library/pages/LibraryPage";
import { transitions } from "./design/motion";
import { BookPlacement } from "./features/library/utils/shelfLayout";
import {
  loadBooks,
  loadPlacements,
  saveBooks,
  savePlacements,
  type StorageIssue,
} from "./features/books/storage/bookStorage";
import { StorageBanner } from "./components/ui/StorageBanner";
import { createBackup, downloadBackup, mergeBackup, parseBackup } from "./features/books/storage/backup";
import type { ImportOutcome } from "./features/library/components/BackupModal";

const loadWorkspacePage = () => import("./features/workspace/pages/WorkspacePage");
// Chunk editor/dokumen ikut di-preload agar tidak ada jeda Suspense saat buku dibuka.
const preloadWorkspace = () => {
  void loadWorkspacePage();
  void import("./features/workspace/components/DocumentView");
};

const WorkspacePage = lazy(() =>
  loadWorkspacePage().then((m) => ({
    default: m.WorkspacePage,
  }))
);

interface InitialLibrary {
  books: Book[];
  placements: Record<string, BookPlacement>;
  issues: StorageIssue[];
}

function loadInitialLibrary(): InitialLibrary {
  const books = loadBooks();
  const placements = loadPlacements();
  const issues = [books.issue, placements.issue].filter((i): i is StorageIssue => Boolean(i));
  return {
    // Only seed mock books when nothing was stored; an intentionally empty library stays empty.
    books: books.data ?? INITIAL_MOCK_BOOKS,
    placements: placements.data ?? {},
    issues,
  };
}

function App() {
  const [initial] = useState(loadInitialLibrary);
  const [books, setBooks] = useState<Book[]>(initial.books);
  const [shelfPlacements, setShelfPlacements] = useState<Record<string, BookPlacement>>(initial.placements);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("library");
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [storageMessage, setStorageMessage] = useState<string | null>(
    initial.issues[0]?.message ?? null
  );

  // zoomHotkeysEnabled (tauri.conf.json) membuat pinch/Ctrl+scroll sampai ke halaman,
  // tetapi juga mengaktifkan zoom seluruh jendela. Cegah itu di mana pun; komponen yang
  // butuh gestur (buku di rak) tetap menerimanya lewat listener capture miliknya sendiri.
  useEffect(() => {
    const blockPageZoomWheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    const blockPageZoomKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["=", "+", "-", "0"].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", blockPageZoomWheel, { passive: false });
    window.addEventListener("keydown", blockPageZoomKeys);
    return () => {
      window.removeEventListener("wheel", blockPageZoomWheel);
      window.removeEventListener("keydown", blockPageZoomKeys);
    };
  }, []);

  // Preload workspace saat browser idle, sehingga klik buku tidak menunggu unduhan chunk.
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(preloadWorkspace);
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(preloadWorkspace, 800);
    return () => window.clearTimeout(t);
  }, []);

  // Persist only after a real change, so a failed or unreadable load is never overwritten by seed data.
  useEffect(() => {
    if (books === initial.books) return;
    const result = saveBooks(books);
    if (!result.ok) setStorageMessage(`Perubahan belum tersimpan. ${result.issue.message}`);
  }, [books, initial.books]);

  useEffect(() => {
    if (shelfPlacements === initial.placements) return;
    const result = savePlacements(shelfPlacements);
    if (!result.ok) setStorageMessage(`Posisi rak belum tersimpan. ${result.issue.message}`);
  }, [shelfPlacements, initial.placements]);

  // Filter active vs trashed books
  const activeBooks = books.filter((b) => !b.deletedAt);
  const trashedBooks = books.filter((b) => Boolean(b.deletedAt));

  // Find active book when in workspace
  const activeBook = books.find((b) => b.id === activeBookId) || activeBooks[0] || books[0];

  const handleOpenBook = (book: Book) => {
    setActiveBookId(book.id);
    setCurrentScreen("workspace");
  };

  const handleCreateBook = (newBook: Book) => {
    setBooks((prev) => [newBook, ...prev]);
    setActiveBookId(newBook.id);
    setCurrentScreen("workspace");
  };

  const handleUpdateBook = (updatedBook: Book) => {
    setBooks((prev) => prev.map((b) => (b.id === updatedBook.id ? updatedBook : b)));
  };

  const handleReorderBooks = (newBooks: Book[]) => {
    setBooks(newBooks);
  };

  const handleUpdatePlacements = (newPlacements: Record<string, BookPlacement>) => {
    setShelfPlacements(newPlacements);
  };

  const handleMoveToTrash = (bookId: string) => {
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, deletedAt: new Date().toISOString() } : b))
    );
  };

  const handleRestoreBook = (bookId: string) => {
    setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, deletedAt: undefined } : b)));
  };

  const handleDeletePermanently = (bookId: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
  };

  const handleEmptyTrash = () => {
    setBooks((prev) => prev.filter((b) => !b.deletedAt));
  };

  const handleExportBackup = () => {
    downloadBackup(createBackup(books, shelfPlacements));
  };

  const handleImportBackup = (fileText: string): ImportOutcome => {
    const parsed = parseBackup(fileText);
    if (!parsed.ok) return parsed;
    const merged = mergeBackup(books, shelfPlacements, parsed.backup);
    if (merged.added > 0) {
      setBooks(merged.books);
      setShelfPlacements(merged.placements);
    }
    return { ok: true, added: merged.added, skipped: merged.skipped };
  };

  const handleBackToLibrary = () => {
    setCurrentScreen("library");
  };

  return (
    <div className="app-root">
      {/* mode="sync": layar lama dan baru crossfade bersamaan (ditumpuk via grid di App.css),
          tidak ada lagi layar kosong di antara library dan workspace. */}
      <AnimatePresence mode="sync" initial={false}>
        {currentScreen === "library" ? (
          <motion.div
            key="screen-library"
            className="screen-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transitions.screenCrossfade}
          >
            <LibraryPage
              books={activeBooks}
              trashedBooks={trashedBooks}
              placements={shelfPlacements}
              onPlacementsChange={handleUpdatePlacements}
              onOpenBook={handleOpenBook}
              onCreateBook={handleCreateBook}
              onUpdateBook={handleUpdateBook}
              onReorderBooks={handleReorderBooks}
              onMoveToTrash={handleMoveToTrash}
              onRestoreBook={handleRestoreBook}
              onDeletePermanently={handleDeletePermanently}
              onEmptyTrash={handleEmptyTrash}
              totalBookCount={books.length}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`screen-workspace-${activeBook?.id || "empty"}`}
            className="screen-container"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={transitions.screenCrossfade}
          >
            {activeBook && (
              <Suspense fallback={<div className="screen-container" style={{ background: "var(--bg-primary)" }} />}>
                <WorkspacePage
                  book={activeBook}
                  onBackToLibrary={handleBackToLibrary}
                  onUpdateBook={handleUpdateBook}
                />
              </Suspense>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {storageMessage && (
        <StorageBanner message={storageMessage} onDismiss={() => setStorageMessage(null)} />
      )}
    </div>
  );
}

export default App;

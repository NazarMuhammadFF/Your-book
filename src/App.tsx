import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import "./App.css";
import { Book } from "./features/books/types/book";
import { INITIAL_MOCK_BOOKS } from "./features/books/mock/mockBooks";
import { AppScreen } from "./types/navigation";
import { LibraryPage } from "./features/library/pages/LibraryPage";
import { WorkspacePage } from "./features/workspace/pages/WorkspacePage";
import { transitions } from "./design/motion";
import { BookPlacement } from "./features/library/utils/shelfLayout";

const BOOKS_STORAGE_KEY = "booknote_books_v1";
const PLACEMENTS_STORAGE_KEY = "booknote_shelf_placements_v1";

function loadSavedBooks(): Book[] {
  try {
    const raw = localStorage.getItem(BOOKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load saved books from localStorage:", e);
  }
  return INITIAL_MOCK_BOOKS;
}

function loadSavedPlacements(): Record<string, BookPlacement> {
  try {
    const raw = localStorage.getItem(PLACEMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load saved placements from localStorage:", e);
  }
  return {};
}

function App() {
  const [books, setBooks] = useState<Book[]>(loadSavedBooks);
  const [shelfPlacements, setShelfPlacements] = useState<Record<string, BookPlacement>>(loadSavedPlacements);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("library");
  const [activeBookId, setActiveBookId] = useState<string | null>(null);

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
    setBooks((prev) => {
      const next = [newBook, ...prev];
      try {
        localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to save books to localStorage:", e);
      }
      return next;
    });
    setActiveBookId(newBook.id);
    setCurrentScreen("workspace");
  };

  const handleUpdateBook = (updatedBook: Book) => {
    setBooks((prev) => {
      const next = prev.map((b) => (b.id === updatedBook.id ? updatedBook : b));
      try {
        localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to save books to localStorage:", e);
      }
      return next;
    });
  };

  const handleReorderBooks = (newBooks: Book[]) => {
    setBooks(newBooks);
    try {
      localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(newBooks));
    } catch (e) {
      console.warn("Failed to save books to localStorage:", e);
    }
  };

  const handleUpdatePlacements = (newPlacements: Record<string, BookPlacement>) => {
    setShelfPlacements(newPlacements);
    try {
      localStorage.setItem(PLACEMENTS_STORAGE_KEY, JSON.stringify(newPlacements));
    } catch (e) {
      console.warn("Failed to save placements to localStorage:", e);
    }
  };

  const handleMoveToTrash = (bookId: string) => {
    setBooks((prev) => {
      const next = prev.map((b) =>
        b.id === bookId ? { ...b, deletedAt: new Date().toISOString() } : b
      );
      try {
        localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to save books to localStorage:", e);
      }
      return next;
    });
  };

  const handleRestoreBook = (bookId: string) => {
    setBooks((prev) => {
      const next = prev.map((b) =>
        b.id === bookId ? { ...b, deletedAt: undefined } : b
      );
      try {
        localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to save books to localStorage:", e);
      }
      return next;
    });
  };

  const handleDeletePermanently = (bookId: string) => {
    setBooks((prev) => {
      const next = prev.filter((b) => b.id !== bookId);
      try {
        localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to save books to localStorage:", e);
      }
      return next;
    });
  };

  const handleEmptyTrash = () => {
    setBooks((prev) => {
      const next = prev.filter((b) => !b.deletedAt);
      try {
        localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to save books to localStorage:", e);
      }
      return next;
    });
  };

  const handleBackToLibrary = () => {
    setCurrentScreen("library");
  };

  return (
    <div className="app-root">
      <AnimatePresence mode="wait">
        {currentScreen === "library" ? (
          <motion.div
            key="screen-library"
            className="screen-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transitions.pageFade}
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
            />
          </motion.div>
        ) : (
          <motion.div
            key={`screen-workspace-${activeBook?.id || "empty"}`}
            className="screen-container"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={transitions.pageFade}
          >
            {activeBook && (
              <WorkspacePage
                book={activeBook}
                onBackToLibrary={handleBackToLibrary}
                onUpdateBook={handleUpdateBook}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;

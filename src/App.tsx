import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import "./App.css";
import { Book } from "./features/books/types/book";
import { INITIAL_MOCK_BOOKS } from "./features/books/mock/mockBooks";
import { AppScreen } from "./types/navigation";
import { LibraryPage } from "./features/library/pages/LibraryPage";
import { WorkspacePage } from "./features/workspace/pages/WorkspacePage";
import { transitions } from "./design/motion";

function App() {
  // Session in-memory books state
  const [books, setBooks] = useState<Book[]>(INITIAL_MOCK_BOOKS);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("library");
  const [activeBookId, setActiveBookId] = useState<string | null>(null);

  // Find active book when in workspace
  const activeBook = books.find((b) => b.id === activeBookId) || books[0];

  const handleOpenBook = (book: Book) => {
    setActiveBookId(book.id);
    setCurrentScreen("workspace");
  };

  const handleCreateBook = (newBook: Book) => {
    setBooks((prev) => [newBook, ...prev]);
    setActiveBookId(newBook.id);
    setCurrentScreen("workspace");
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
              books={books}
              onOpenBook={handleOpenBook}
              onCreateBook={handleCreateBook}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`screen-workspace-${activeBook.id}`}
            className="screen-container"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={transitions.pageFade}
          >
            <WorkspacePage
              book={activeBook}
              onBackToLibrary={handleBackToLibrary}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;

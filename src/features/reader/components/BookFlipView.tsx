import React, { useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { Button } from "../../../components/ui/Button";
import { Book } from "../../books/types/book";
import { BookFlipAdapter } from "../flip/BookFlipAdapter";
import { StPageFlipAdapter } from "../flip/StPageFlipAdapter";
import { BookFlipSnapshot } from "../flip/types";
import { ReaderPageData } from "../types/readerPage";
import { ReaderPage } from "./ReaderPage";
import styles from "./BookFlipView.module.css";

export interface BookFlipViewProps {
  book: Book;
  pages: ReaderPageData[];
  pageIndex: number;
  onPageIndexChange: (pageIndex: number) => void;
}

function normalizePageIndex(pageIndex: number, pageCount: number): number {
  const bounded = Math.max(0, Math.min(pageIndex, Math.max(0, pageCount - 2)));
  return bounded - (bounded % 2);
}

export const BookFlipView: React.FC<BookFlipViewProps> = ({
  book,
  pages,
  pageIndex,
  onPageIndexChange,
}) => {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const frameRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const pageElementsRef = useRef<Array<HTMLDivElement | null>>([]);
  const adapterRef = useRef<BookFlipAdapter | null>(null);
  const generationRef = useRef(0);
  const initialSnapshot: BookFlipSnapshot = {
    currentPageIndex: normalizePageIndex(pageIndex, pages.length),
    pageCount: pages.length,
    isAtStart: pageIndex <= 0,
    isAtEnd: pageIndex >= Math.max(0, pages.length - 2),
    state: "idle",
  };
  const [snapshot, setSnapshot] = useState<BookFlipSnapshot>(initialSnapshot);

  useLayoutEffect(() => {
    if (prefersReducedMotion || !hostRef.current || !frameRef.current) return;

    const pageElements = pageElementsRef.current.filter(
      (element): element is HTMLDivElement => element !== null,
    );
    if (pageElements.length !== pages.length) return;

    const generation = ++generationRef.current;
    const adapter = new StPageFlipAdapter();
    adapterRef.current = adapter;
    adapter.mount({
      host: hostRef.current,
      pageElements,
      initialPageIndex: pageIndex,
      onSnapshotChange: (nextSnapshot) => {
        if (generationRef.current !== generation || adapterRef.current !== adapter) return;
        setSnapshot(nextSnapshot);
        onPageIndexChange(nextSnapshot.currentPageIndex);
      },
    });

    let resizeFrame: number | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        if (generationRef.current === generation) adapter.updateLayout();
      });
    });
    resizeObserver.observe(frameRef.current);

    return () => {
      generationRef.current += 1;
      resizeObserver.disconnect();
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      if (adapterRef.current === adapter) adapterRef.current = null;
      adapter.destroy();
    };
  }, [book.id, onPageIndexChange, pages, prefersReducedMotion]);

  const staticPageIndex = normalizePageIndex(pageIndex, pages.length);
  const activeSnapshot = prefersReducedMotion
    ? {
        currentPageIndex: staticPageIndex,
        pageCount: pages.length,
        isAtStart: staticPageIndex === 0,
        isAtEnd: staticPageIndex >= Math.max(0, pages.length - 2),
        state: "idle" as const,
      }
    : snapshot;

  const goPrevious = () => {
    if (activeSnapshot.isAtStart) return;
    if (prefersReducedMotion) onPageIndexChange(Math.max(0, staticPageIndex - 2));
    else adapterRef.current?.previous();
  };

  const goNext = () => {
    if (activeSnapshot.isAtEnd) return;
    if (prefersReducedMotion) {
      onPageIndexChange(Math.min(pages.length - 2, staticPageIndex + 2));
    } else {
      adapterRef.current?.next();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrevious();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    }
  };

  const firstVisiblePage = activeSnapshot.currentPageIndex + 1;
  const lastVisiblePage = Math.min(firstVisiblePage + 1, activeSnapshot.pageCount);
  const interactionHint = prefersReducedMotion
    ? "Reduced motion: use the controls or arrow keys"
    : activeSnapshot.state === "dragging"
      ? "Release to turn or return the page"
      : "Drag an outer page corner to turn";

  return (
    <section
      className={styles.reader}
      aria-label={`Interactive Book View for ${book.title}`}
    >
      <div
        ref={frameRef}
        className={styles.hardcover}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label="Book pages. Use Left and Right Arrow keys to navigate."
      >
        <div className={styles.pageStackLeft} aria-hidden="true" />
        <div className={styles.pageStackRight} aria-hidden="true" />

        {prefersReducedMotion ? (
          <div className={styles.staticSpread}>
            {pages.slice(staticPageIndex, staticPageIndex + 2).map((page) => (
              <ReaderPage key={page.id} book={book} page={page} />
            ))}
          </div>
        ) : (
          <div ref={hostRef} className={styles.engineHost}>
            {pages.map((page, index) => (
              <ReaderPage
                key={page.id}
                ref={(element) => {
                  pageElementsRef.current[index] = element;
                }}
                book={book}
                page={page}
              />
            ))}
          </div>
        )}

        <div className={styles.gutter} aria-hidden="true" />
      </div>

      <div className={styles.controls}>
        <Button
          size="sm"
          variant="ghost"
          icon={<ChevronLeft size={16} />}
          disabled={activeSnapshot.isAtStart}
          onClick={goPrevious}
        >
          Previous
        </Button>
        <span className={styles.status} aria-live="polite">
          Pages {firstVisiblePage}–{lastVisiblePage} of {activeSnapshot.pageCount}
        </span>
        <Button
          size="sm"
          variant="ghost"
          icon={<ChevronRight size={16} />}
          disabled={activeSnapshot.isAtEnd}
          onClick={goNext}
        >
          Next
        </Button>
      </div>
      <p className={styles.hint}>{interactionHint}</p>
    </section>
  );
};

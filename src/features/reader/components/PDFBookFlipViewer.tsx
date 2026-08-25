import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import HTMLFlipBook, { FlipBookRef } from "react-pageflip";
import { Button } from "../../../components/ui/Button";
import { Book, getBookPageMetrics } from "../../books/types/book";
import { loadPDFDocument, renderPDFPageToDataURL } from "../../books/services/pdfService";
import type { PDFDocumentProxy } from "pdfjs-dist";
import styles from "./BookFlipView.module.css";

export interface PDFBookFlipViewerProps {
  book: Book;
  pageIndex: number;
  onPageIndexChange: (pageIndex: number) => void;
}

interface PDFPageSlotProps {
  pageNum: number;
  imageSrc?: string;
  isEndCover?: boolean;
}

const PDFPageSlot = React.forwardRef<HTMLDivElement, PDFPageSlotProps>(
  ({ pageNum, imageSrc, isEndCover }, ref) => {
    return (
      <div ref={ref} className={styles.flipPage} data-density="soft">
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
            padding: "8px",
            boxSizing: "border-box",
            position: "relative",
          }}
        >
          {isEndCover ? (
            <div style={{ color: "#aaa", fontSize: "12px", fontFamily: "sans-serif" }}>
              — End of E-Book —
            </div>
          ) : imageSrc ? (
            <img
              src={imageSrc}
              alt={`Page ${pageNum}`}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            />
          ) : (
            <div style={{ color: "#999", fontSize: "12px" }}>Rendering Page {pageNum}...</div>
          )}
          <div
            style={{
              position: "absolute",
              bottom: "6px",
              fontSize: "10px",
              color: "#aaa",
              fontFamily: "monospace",
            }}
          >
            {pageNum}
          </div>
        </div>
      </div>
    );
  }
);
PDFPageSlot.displayName = "PDFPageSlot";

export const PDFBookFlipViewer: React.FC<PDFBookFlipViewerProps> = ({
  book,
  pageIndex,
  onPageIndexChange,
}) => {
  const flipBookRef = useRef<FlipBookRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [renderedPages, setRenderedPages] = useState<Record<number, string>>({});
  const [scale, setScale] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(pageIndex);
  const [error, setError] = useState<string | null>(null);

  const pageMetrics = useMemo(() => getBookPageMetrics(book), [book]);
  const totalPages = book.pdfMetadata?.totalPages || 0;

  const targetSpreadWidth = pageMetrics.spreadWidth + 32;
  const targetSpreadHeight = pageMetrics.pageHeight + 28;

  // Load PDF Document
  useEffect(() => {
    let active = true;
    const pdfPath = book.pdfMetadata?.filePath;
    if (!pdfPath) {
      setError("File PDF tidak ditemukan.");
      return;
    }

    loadPDFDocument(pdfPath)
      .then((doc) => {
        if (active) {
          setPdfDoc(doc);
          setError(null);
        }
      })
      .catch((err) => {
        console.error("Failed to load PDF in flip view:", err);
        if (active) setError("Gagal memuat PDF.");
      });

    return () => {
      active = false;
    };
  }, [book.pdfMetadata?.filePath]);

  // Ensure even page count for spreads
  const totalDisplayPages = totalPages % 2 === 0 ? totalPages : totalPages + 1;
  const displayPagesList = Array.from({ length: totalDisplayPages }, (_, i) => i + 1);

  // Lazy render pages around the current visible spread
  useEffect(() => {
    if (!pdfDoc) return;

    let isMounted = true;
    const pagesToLoad = [
      currentPage,
      currentPage + 1,
      currentPage + 2,
      currentPage + 3,
      currentPage - 1,
      currentPage - 2,
    ].filter((p) => p >= 1 && p <= totalPages && !renderedPages[p]);

    if (pagesToLoad.length === 0) return;

    Promise.all(
      pagesToLoad.map(async (p) => {
        try {
          const dataUrl = await renderPDFPageToDataURL(pdfDoc, p, 1.2);
          return { pageNum: p, dataUrl };
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (!isMounted) return;
      setRenderedPages((prev) => {
        const next = { ...prev };
        results.forEach((res) => {
          if (res) next[res.pageNum] = res.dataUrl;
        });
        return next;
      });
    });

    return () => {
      isMounted = false;
    };
  }, [pdfDoc, currentPage, totalPages, renderedPages]);

  // Responsive scale from container
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (!containerRef.current) return;
      const availableWidth = containerRef.current.clientWidth - 32;
      const availableHeight = containerRef.current.clientHeight - 80;
      if (availableWidth > 0 && targetSpreadWidth > 0) {
        const scaleX = availableWidth / targetSpreadWidth;
        const scaleY =
          availableHeight > 0 && targetSpreadHeight > 0
            ? availableHeight / targetSpreadHeight
            : 1;
        const nextScale = Math.min(1, Math.max(0.35, Math.min(scaleX, scaleY)));
        setScale(nextScale);
      }
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [targetSpreadWidth, targetSpreadHeight]);

  const handleFlip = (e: { data: number }) => {
    setCurrentPage(e.data);
    onPageIndexChange(e.data);
  };

  const goNext = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipNext();
    }
  };

  const goPrevious = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipPrev();
    }
  };

  const isAtStart = currentPage <= 0;
  const isAtEnd = currentPage >= totalDisplayPages - 2;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowLeft" && !isAtStart) {
      event.preventDefault();
      goPrevious();
    }
    if (event.key === "ArrowRight" && !isAtEnd) {
      event.preventDefault();
      goNext();
    }
  };

  if (error) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
        <FileText size={36} />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <section
      ref={containerRef}
      className={styles.reader}
      aria-label={`Interactive PDF Book View for ${book.title}`}
    >
      <div
        className={styles.stageWrapper}
        style={{
          width: `${Math.round(targetSpreadWidth * scale)}px`,
          height: `${Math.round(targetSpreadHeight * scale)}px`,
        }}
      >
        <div
          className={styles.hardcoverWrapper}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label="PDF pages. Use Left and Right Arrow keys to navigate."
          style={{
            width: `${targetSpreadWidth}px`,
            height: `${targetSpreadHeight}px`,
            transform: scale < 1 ? `scale(${scale})` : undefined,
            transformOrigin: "top left",
          }}
        >
          <HTMLFlipBook
            ref={flipBookRef}
            width={pageMetrics.pageWidth}
            height={pageMetrics.pageHeight}
            size="fixed"
            minWidth={280}
            maxWidth={pageMetrics.pageWidth}
            minHeight={380}
            maxHeight={pageMetrics.pageHeight}
            drawShadow={true}
            flippingTime={600}
            usePortrait={false}
            startPage={currentPage}
            isMouseMoveEvent={true}
            showCover={false}
            mobileScrollSupport={true}
            onFlip={handleFlip}
          >
            {displayPagesList.map((pageNum) => (
              <PDFPageSlot
                key={`pdf-flip-${pageNum}`}
                pageNum={pageNum}
                imageSrc={renderedPages[pageNum]}
                isEndCover={pageNum > totalPages}
              />
            ))}
          </HTMLFlipBook>
        </div>
      </div>

      <div className={styles.controls}>
        <Button
          size="sm"
          variant="ghost"
          icon={<ChevronLeft size={16} />}
          disabled={isAtStart}
          onClick={goPrevious}
        >
          Previous
        </Button>
        <span className={styles.status} aria-live="polite">
          Pages {currentPage + 1}–{Math.min(currentPage + 2, totalDisplayPages)} of {totalDisplayPages}
        </span>
        <Button
          size="sm"
          variant="ghost"
          icon={<ChevronRight size={16} />}
          disabled={isAtEnd}
          onClick={goNext}
        >
          Next
        </Button>
      </div>
      <p className={styles.hint}>
        Drag PDF page corners or use Left/Right Arrow keys to turn pages
      </p>
    </section>
  );
};

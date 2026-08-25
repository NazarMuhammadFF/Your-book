import React, { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, FileText } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Book } from "../../books/types/book";
import { loadPDFDocument, renderPDFPageToCanvas } from "../../books/services/pdfService";
import type { PDFDocumentProxy } from "pdfjs-dist";
import styles from "./PDFDocumentViewer.module.css";

export interface PDFDocumentViewerProps {
  book: Book;
}

interface PageItemProps {
  pdfDoc: PDFDocumentProxy;
  pageNum: number;
  scale: number;
}

const PDFPageCanvas: React.FC<PageItemProps> = ({ pdfDoc, pageNum, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!canvasRef.current || !pdfDoc) return;

    setLoading(true);
    renderPDFPageToCanvas(pdfDoc, pageNum, canvasRef.current, scale)
      .then(() => {
        if (active) setLoading(false);
      })
      .catch((err) => {
        console.error(`Error rendering page ${pageNum}:`, err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [pdfDoc, pageNum, scale]);

  return (
    <div className={styles.pageCard} data-page={pageNum}>
      <div className={styles.pageHeader}>
        <span>Page {pageNum}</span>
      </div>
      <div className={styles.canvasContainer}>
        {loading && <div className={styles.pageSkeleton}>Loading page {pageNum}...</div>}
        <canvas ref={canvasRef} className={styles.pdfCanvas} />
      </div>
    </div>
  );
};

export const PDFDocumentViewer: React.FC<PDFDocumentViewerProps> = ({ book }) => {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1.2);
  const totalPages = book.pdfMetadata?.totalPages || 0;

  useEffect(() => {
    let isMounted = true;
    const pdfPath = book.pdfMetadata?.filePath;

    if (!pdfPath) {
      setError("File PDF tidak ditemukan atau metadata rusak.");
      return;
    }

    loadPDFDocument(pdfPath)
      .then((doc) => {
        if (isMounted) {
          setPdfDoc(doc);
          setError(null);
        }
      })
      .catch((err) => {
        console.error("Failed to load PDF:", err);
        if (isMounted) {
          setError("Gagal memuat dokumen PDF. Pastikan file valid.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [book.pdfMetadata?.filePath]);

  if (error) {
    return (
      <div className={styles.errorState}>
        <FileText size={48} className={styles.errorIcon} />
        <h3>Gagal Memuat E-Book PDF</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!pdfDoc) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <p>Membuka E-Book PDF...</p>
      </div>
    );
  }

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className={styles.container}>
      {/* Top Floating Control Bar */}
      <div className={styles.toolbar}>
        <div className={styles.docInfo}>
          <FileText size={16} />
          <span className={styles.docTitle}>{book.pdfMetadata?.fileName || book.title}</span>
          <span className={styles.badgeReadonly}>Read-Only</span>
        </div>

        <div className={styles.zoomControls}>
          <Button
            size="sm"
            variant="ghost"
            icon={<ZoomOut size={14} />}
            onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.2).toFixed(1))))}
            disabled={scale <= 0.6}
          />
          <span className={styles.zoomLevel}>{Math.round(scale * 100)}%</span>
          <Button
            size="sm"
            variant="ghost"
            icon={<ZoomIn size={14} />}
            onClick={() => setScale((s) => Math.min(2.5, Number((s + 0.2).toFixed(1))))}
            disabled={scale >= 2.5}
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<RotateCcw size={14} />}
            onClick={() => setScale(1.2)}
            title="Reset Zoom"
          />
        </div>
      </div>

      {/* Vertical Continuous Scroll View */}
      <div className={styles.scrollArea}>
        {pageNumbers.map((pageNum) => (
          <PDFPageCanvas
            key={`pdf-page-${pageNum}`}
            pdfDoc={pdfDoc}
            pageNum={pageNum}
            scale={scale}
          />
        ))}
      </div>
    </div>
  );
};

import React from "react";
import styles from "./DocumentPage.module.css";
import { BookTypography, BookPageSettings, PageRenderMetrics } from "../../books/types/book";
import { FONT_FAMILIES } from "../../../design/typography";

export interface DocumentPageProps {
  pageNumber: number;
  totalPages?: number;
  headerTitle?: string;
  typography: BookTypography;
  pageSettings: BookPageSettings;
  pageMetrics?: PageRenderMetrics;
  children: React.ReactNode;
  className?: string;
}

export const DocumentPage: React.FC<DocumentPageProps> = ({
  pageNumber,
  headerTitle,
  typography,
  pageSettings,
  pageMetrics,
  children,
  className = "",
}) => {
  const fontConfig =
    FONT_FAMILIES.find((f) => f.id === typography.fontFamilyId) || FONT_FAMILIES[0];
  const marginClass = styles[pageSettings.pageMargin] || styles.normal;

  return (
    <div
      className={`${styles.pageSheet} ${marginClass} ${className}`}
      style={
        {
          fontFamily: fontConfig.fontFamily,
          fontSize: `${typography.fontSize}px`,
          lineHeight: typography.lineHeight,
          textAlign: typography.textAlignment,
          "--doc-p-spacing": `${typography.paragraphSpacing}px`,
          maxWidth: pageMetrics ? `${pageMetrics.pageWidth}px` : undefined,
          aspectRatio: pageMetrics ? `${pageMetrics.width} / ${pageMetrics.height}` : undefined,
          minHeight: pageMetrics ? `${pageMetrics.pageHeight}px` : undefined,
        } as React.CSSProperties
      }
    >
      {/* Running Header Area */}
      <div className={styles.pageHeader}>
        {headerTitle && <span className={styles.headerText}>{headerTitle}</span>}
      </div>

      {/* Printable Content Flow Body */}
      <div className={styles.pageContentBody}>{children}</div>

      {/* Page Footer / Number Area */}
      {pageSettings.showPageNumbers && (
        <div className={styles.pageFooter}>
          <span className={styles.pageNumber}>{pageNumber}</span>
        </div>
      )}
    </div>
  );
};

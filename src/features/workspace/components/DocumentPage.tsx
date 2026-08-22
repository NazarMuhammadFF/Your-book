import React from "react";
import styles from "./DocumentPage.module.css";
import { BookTypography, BookPageSettings } from "../../books/types/book";
import { FONT_FAMILIES } from "../../../design/typography";

export interface DocumentPageProps {
  pageNumber: number;
  totalPages?: number;
  headerTitle?: string;
  typography: BookTypography;
  pageSettings: BookPageSettings;
  children: React.ReactNode;
  className?: string;
}

export const DocumentPage: React.FC<DocumentPageProps> = ({
  pageNumber,
  headerTitle,
  typography,
  pageSettings,
  children,
  className = "",
}) => {
  const fontConfig =
    FONT_FAMILIES.find((f) => f.id === typography.fontFamilyId) || FONT_FAMILIES[0];
  const marginClass = styles[pageSettings.pageMargin] || styles.normal;

  return (
    <div
      className={`${styles.a4PageSheet} ${marginClass} ${className}`}
      style={
        {
          fontFamily: fontConfig.fontFamily,
          fontSize: `${typography.fontSize}px`,
          lineHeight: typography.lineHeight,
          textAlign: typography.textAlignment,
          "--doc-p-spacing": `${typography.paragraphSpacing}px`,
        } as React.CSSProperties
      }
    >
      {/* A4 Print Running Header Area */}
      <div className={styles.pageHeader}>
        {headerTitle && <span className={styles.headerText}>{headerTitle}</span>}
      </div>

      {/* A4 Printable Content Flow Body */}
      <div className={styles.pageContentBody}>{children}</div>

      {/* A4 Page Footer / Number Area */}
      {pageSettings.showPageNumbers && (
        <div className={styles.pageFooter}>
          <span className={styles.pageNumber}>{pageNumber}</span>
        </div>
      )}
    </div>
  );
};

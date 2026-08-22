import React from "react";
import styles from "./BackCover.module.css";
import { Book } from "../types/book";
import { COVER_PALETTES } from "../../../design/typography";

export interface BackCoverProps {
  book: Book;
  compact?: boolean;
  className?: string;
}

export const BackCover: React.FC<BackCoverProps> = ({
  book,
  compact = false,
  className = "",
}) => {
  const palette =
    COVER_PALETTES.find((p) => p.id === book.cover.paletteId) || COVER_PALETTES[0];

  const fontLabel =
    book.typography.fontFamilyId === "serif"
      ? "Classic Serif"
      : book.typography.fontFamilyId === "sans"
      ? "Modern Sans"
      : "Focus Mono";

  const marginLabel =
    book.pageSettings.pageMargin === "compact"
      ? "Compact Margins"
      : book.pageSettings.pageMargin === "spacious"
      ? "Spacious Margins"
      : "Standard Margins";

  const formattedDate = new Date(book.updatedAt || book.createdAt).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );

  return (
    <div
      className={`${styles.backCover} ${className}`}
      style={
        {
          "--cover-primary": palette.primary,
          "--cover-secondary": palette.secondary,
          "--cover-accent": palette.accent,
          "--cover-text": palette.textColor,
          "--cover-grad": palette.textureGradient,
        } as React.CSSProperties
      }
    >
      <div className={styles.textureSheen} />
      <div className={styles.spineHinge} />

      <div className={styles.headerSection}>
        {book.cover.badgeText && <div className={styles.badge}>{book.cover.badgeText}</div>}
        <h3 className={styles.title}>{book.title}</h3>
        {book.cover.authorName && (
          <span className={styles.author}>{book.cover.authorName}</span>
        )}
      </div>

      <div className={styles.synopsisSection}>
        <p className={styles.synopsisText}>
          {book.subtitle ||
            "A bound collection of thoughts, structured prose, and quiet personal reflections designed for focused contemplation."}
        </p>
      </div>

      {!compact && (
        <div className={styles.metaSection}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Typography</span>
            <span className={styles.metaValue}>
              {fontLabel} · {book.typography.fontSize}px
            </span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Layout</span>
            <span className={styles.metaValue}>{marginLabel}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Last Modified</span>
            <span className={styles.metaValue}>{formattedDate}</span>
          </div>
        </div>
      )}
    </div>
  );
};

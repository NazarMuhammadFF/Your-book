import React from "react";
import styles from "./BookCover.module.css";
import { BookCover as IBookCover } from "../types/book";
import { COVER_PALETTES } from "../../../design/typography";

export interface BookCoverProps {
  cover: IBookCover;
  title: string;
  subtitle?: string;
  className?: string;
  compact?: boolean;
}

export const BookCover: React.FC<BookCoverProps> = ({
  cover,
  title,
  subtitle,
  className = "",
  compact = false,
}) => {
  const palette = COVER_PALETTES.find((p) => p.id === cover.paletteId) || COVER_PALETTES[0];

  return (
    <div
      className={`${styles.cover} ${styles[cover.pattern]} ${compact ? styles.compact : ""} ${className}`}
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
      {/* Subtle paper/cloth texture sheen overlay */}
      <div className={styles.textureSheen} />

      {/* Left spine hinge fold shadow line */}
      <div className={styles.spineHinge} />

      {/* Pattern decoration layers */}
      {cover.pattern === "classic-frame" && (
        <div className={styles.frameDecoration}>
          <div className={styles.innerFrame} />
        </div>
      )}

      {cover.pattern === "modern-geo" && (
        <div className={styles.geoDecoration}>
          <div className={styles.geoLineVertical} />
          <div className={styles.geoLineHorizontal} />
          <div className={styles.geoDiamond} />
        </div>
      )}

      {cover.pattern === "vintage-border" && (
        <div className={styles.vintageDecoration}>
          <span className={styles.cornerTL}>⌜</span>
          <span className={styles.cornerTR}>⌝</span>
          <span className={styles.cornerBL}>⌞</span>
          <span className={styles.cornerBR}>⌟</span>
          <div className={styles.vintageRule} />
        </div>
      )}

      {cover.pattern === "center-badge" && (
        <div className={styles.badgeDecoration}>
          <div className={styles.emblem}>{cover.badgeText || "★"}</div>
        </div>
      )}

      {/* Title and metadata layout */}
      <div className={styles.content}>
        {cover.badgeText && cover.pattern !== "center-badge" && (
          <div className={styles.badge}>{cover.badgeText}</div>
        )}

        {cover.titleVisible && (
          <div className={styles.titleSection}>
            <h3 className={styles.title}>{title || "Untitled Book"}</h3>
            {subtitle && !compact && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
        )}

        {cover.authorVisible && (
          <div className={styles.authorSection}>
            <div className={styles.authorRule} />
            <span className={styles.author}>{cover.authorName || "BookNote"}</span>
          </div>
        )}
      </div>
    </div>
  );
};

import { CoverPattern } from "../../../design/typography";

export interface BookCover {
  paletteId: string;
  pattern: CoverPattern;
  titleVisible: boolean;
  authorVisible?: boolean;
  authorName?: string;
  badgeText?: string;
}

export interface BookTypography {
  fontFamilyId: string;
  fontSize: number; // in px, default 17
  lineHeight: number; // unitless, default 1.65
  paragraphSpacing: number; // in px, default 16
  textAlignment: "left" | "justify";
}

export interface BookPageSettings {
  pageMargin: "compact" | "normal" | "spacious";
  pageSizePreset: "standard" | "novel" | "compact";
  showPageNumbers: boolean;
}

export interface BookVisualDimensions {
  width: number; // base px e.g. 150
  height: number; // base px e.g. 210
  thickness: number; // spine thickness in px e.g. 24
  rotationDeg: number; // natural shelf angle e.g. -1.2 to 1.5
}

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  cover: BookCover;
  typography: BookTypography;
  pageSettings: BookPageSettings;
  dimensions: BookVisualDimensions;
  createdAt: string;
  updatedAt: string;
}

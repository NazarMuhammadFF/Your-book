import { CoverPattern } from "../../../design/typography";
import { JSONContent } from "@tiptap/react";

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

export type PageSizePreset = "a6" | "a5" | "b5" | "a4" | "letter" | "legal" | "standard" | "novel" | "compact";

export interface PageSizeOption {
  id: PageSizePreset;
  label: string;
  description: string;
  width: number;
  height: number;
}

export const PAGE_SIZE_PRESETS: PageSizeOption[] = [
  { id: "a6", label: "A6 (Pocket)", description: "Compact handbook (145 × 195 px)", width: 145, height: 195 },
  { id: "a5", label: "A5 (Standard)", description: "Standard book & journal (165 × 225 px)", width: 165, height: 225 },
  { id: "b5", label: "B5 (Journal)", description: "Executive notebook (175 × 240 px)", width: 175, height: 240 },
  { id: "a4", label: "A4 (Document)", description: "Large document format (195 × 265 px)", width: 195, height: 265 },
  { id: "letter", label: "US Letter", description: "Standard US letter (175 × 230 px)", width: 175, height: 230 },
  { id: "legal", label: "US Legal", description: "Extended US legal (175 × 255 px)", width: 175, height: 255 },
];

export interface BookPageSettings {
  pageMargin: "compact" | "normal" | "spacious";
  pageSizePreset: PageSizePreset;
  showPageNumbers: boolean;
  pagesOffset?: number; // Inset from cover edge in px (e.g. 2 to 10px)
  coverThickness?: number; // Front & back cover board thickness in px (e.g. 1 to 8px)
}

export interface BookVisualDimensions {
  width: number; // base px e.g. 165
  height: number; // base px e.g. 225
  thickness: number; // spine thickness in px e.g. 44
  pagesOffset?: number; // Inset from cover edge in px, default 5px
  coverThickness?: number; // Board thickness in px, default 3px
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
  content?: JSONContent;
  createdAt: string;
  updatedAt: string;
}

/**
 * Resolves standard book dimensions from a preset ID, thickness, and offsets.
 */
export function getDimensionsFromPreset(
  presetId: PageSizePreset,
  thickness = 44,
  pagesOffset = 5,
  coverThickness = 3
): BookVisualDimensions {
  const preset =
    PAGE_SIZE_PRESETS.find((p) => p.id === presetId) ||
    PAGE_SIZE_PRESETS.find((p) => p.id === "a5") ||
    PAGE_SIZE_PRESETS[1];
  return {
    width: preset.width,
    height: preset.height,
    thickness,
    pagesOffset,
    coverThickness,
    rotationDeg: 0,
  };
}

/**
 * Calculates physical book thickness based on page count.
 */
export function calculateThicknessFromPages(pageCount: number): number {
  return Math.max(12, Math.round(0.85 * Math.pow(pageCount, 0.6)));
}

/**
 * Returns deterministic visual thickness for shelf packing.
 */
export function getBookVisualThickness(book: Book): number {
  if (book.dimensions && typeof book.dimensions.thickness === "number") {
    return Math.max(16, Math.round(book.dimensions.thickness));
  }
  return 42;
}

/**
 * Returns complete visual dimensions for a book with safe defaults.
 */
export function getBookDimensions(book: Book): BookVisualDimensions & {
  pagesOffset: number;
  coverThickness: number;
} {
  let width = book.dimensions?.width;
  let height = book.dimensions?.height;

  // Fallback to preset if width/height not set
  if (!width || !height) {
    const preset =
      PAGE_SIZE_PRESETS.find((p) => p.id === book.pageSettings?.pageSizePreset) ||
      PAGE_SIZE_PRESETS[1];
    width = preset.width;
    height = preset.height;
  }

  const thickness = getBookVisualThickness(book);
  const pagesOffset =
    typeof book.dimensions?.pagesOffset === "number"
      ? book.dimensions.pagesOffset
      : typeof book.pageSettings?.pagesOffset === "number"
      ? book.pageSettings.pagesOffset
      : 5;

  const coverThickness =
    typeof book.dimensions?.coverThickness === "number"
      ? book.dimensions.coverThickness
      : typeof book.pageSettings?.coverThickness === "number"
      ? book.pageSettings.coverThickness
      : 3;

  const rotationDeg = book.dimensions?.rotationDeg || 0;

  return { width, height, thickness, pagesOffset, coverThickness, rotationDeg };
}

export interface PageRenderMetrics {
  presetId: PageSizePreset;
  presetLabel: string;
  presetDescription: string;
  width: number;
  height: number;
  aspectRatio: number;
  pageWidth: number;
  pageHeight: number;
  spreadWidth: number;
  spreadHeight: number;
}

/**
 * Returns rendering metrics (aspect ratio, scaled page dimensions, spread dimensions)
 * for a book based on its configured pageSizePreset.
 */
export function getBookPageMetrics(book: Book): PageRenderMetrics {
  const presetId = book.pageSettings?.pageSizePreset || "a5";
  const preset =
    PAGE_SIZE_PRESETS.find((p) => p.id === presetId) ||
    PAGE_SIZE_PRESETS[1]; // default A5

  const scale = 2.6;
  const pageWidth = Math.round(preset.width * scale);
  const pageHeight = Math.round(preset.height * scale);

  return {
    presetId: preset.id,
    presetLabel: preset.label,
    presetDescription: preset.description,
    width: preset.width,
    height: preset.height,
    aspectRatio: preset.width / preset.height,
    pageWidth,
    pageHeight,
    spreadWidth: pageWidth * 2,
    spreadHeight: pageHeight,
  };
}

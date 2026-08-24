import { JSONContent } from "@tiptap/react";
import { Book, getBookPageMetrics, getBookPageMargins } from "../../books/types/book";
import { PaginatedPage } from "../types/document";
import { FONT_FAMILIES } from "../../../design/typography";
import { extractTextFromContent } from "./docStats";

export interface PaginationMetrics {
  availableWidth: number;
  availableHeight: number;
  lineHeightPx: number;
  paragraphSpacing: number;
  fontSize: number;
  fontFamily: string;
  pageWidth: number;
  pageHeight: number;
  contentTop: number;
  contentBottom: number;
}

export function computePaginationMetrics(book: Book): PaginationMetrics {
  const pageMetrics = getBookPageMetrics(book);
  const typography = book.typography;
  const margins = getBookPageMargins(book);

  const contentTop = margins.top + 45;
  const contentBottom = margins.bottom + 45;
  const fontSize = typography.fontSize || 17;
  const lineHeight = typography.lineHeight || 1.65;
  const lineHeightPx = Math.round(fontSize * lineHeight);
  const availableWidth = Math.max(160, pageMetrics.pageWidth - margins.left - margins.right);
  const availableHeight = Math.max(
    180,
    pageMetrics.pageHeight - contentTop - contentBottom - lineHeightPx
  );

  const paragraphSpacing = typography.paragraphSpacing || 16;

  const fontConfig =
    FONT_FAMILIES.find((f) => f.id === typography.fontFamilyId) || FONT_FAMILIES[0];
  const fontFamily = fontConfig.fontFamily;

  return {
    availableWidth,
    availableHeight,
    lineHeightPx,
    paragraphSpacing,
    fontSize,
    fontFamily,
    pageWidth: pageMetrics.pageWidth,
    pageHeight: pageMetrics.pageHeight,
    contentTop,
    contentBottom,
  };
}

let measureCanvas: HTMLCanvasElement | null = null;
let measureCtx: CanvasRenderingContext2D | null = null;

function getTextWidth(text: string, font: string): number {
  if (typeof document === "undefined") {
    // Fallback: estimate average character width
    return text.length * 9.5;
  }
  if (!measureCanvas) {
    measureCanvas = document.createElement("canvas");
    measureCtx = measureCanvas.getContext("2d");
  }
  if (measureCtx) {
    measureCtx.font = font;
    return measureCtx.measureText(text).width;
  }
  return text.length * 9.5;
}

/**
 * Splits plain text into visual wrapped lines using exact canvas font measurements.
 */
export function wrapTextIntoLinesExact(
  text: string,
  maxWidth: number,
  font: string
): string[] {
  return wrapTextIntoLineRangesExact(text, maxWidth, font).map((line) => line.text);
}

interface WrappedLine {
  text: string;
  end: number;
}

/** Keep visual wrapping and source offsets together so formatted spans split safely. */
function wrapTextIntoLineRangesExact(
  text: string,
  maxWidth: number,
  font: string
): WrappedLine[] {
  const words = Array.from(text.matchAll(/\S+/g));
  if (words.length === 0) return [];

  const lines: WrappedLine[] = [];
  let currentText = "";
  let currentEnd = 0;

  const wrapLongWord = (word: string, start: number) => {
    let chunk = "";
    let chunkStart = start;

    for (const character of word) {
      const candidate = `${chunk}${character}`;
      if (chunk && getTextWidth(candidate, font) > maxWidth) {
        lines.push({ text: chunk, end: chunkStart + chunk.length });
        chunkStart += chunk.length;
        chunk = character;
      } else {
        chunk = candidate;
      }
    }

    currentText = chunk;
    currentEnd = start + word.length;
  };

  for (const match of words) {
    const word = match[0];
    const wordStart = match.index;
    const candidate = currentText ? `${currentText} ${word}` : word;

    if (getTextWidth(candidate, font) <= maxWidth) {
      currentText = candidate;
      currentEnd = wordStart + word.length;
      continue;
    }

    if (currentText) {
      lines.push({ text: currentText, end: currentEnd });
      currentText = "";
    }

    if (getTextWidth(word, font) > maxWidth) wrapLongWord(word, wordStart);
    else {
      currentText = word;
      currentEnd = wordStart + word.length;
    }
  }

  if (currentText) lines.push({ text: currentText, end: currentEnd });
  return lines;
}

function extractInlineText(node: JSONContent): string {
  return node.content
    ?.map((item) => item.text ?? extractTextFromContent(item))
    .join("") ?? "";
}

function getInlineFontMetrics(
  node: JSONContent,
  metrics: PaginationMetrics
): { font: string; lineHeightPx: number } {
  let fontSize = metrics.fontSize;
  let hasBold = false;

  for (const item of node.content ?? []) {
    for (const mark of item.marks ?? []) {
      if (mark.type === "bold") hasBold = true;
      if (mark.type === "textStyle") {
        const markedSize = Number.parseFloat(String(mark.attrs?.fontSize ?? ""));
        if (Number.isFinite(markedSize)) fontSize = Math.max(fontSize, markedSize);
      }
    }
  }

  return {
    font: `${hasBold ? "600 " : ""}${fontSize}px ${metrics.fontFamily}`,
    lineHeightPx: Math.max(
      metrics.lineHeightPx,
      Math.ceil(fontSize * (metrics.lineHeightPx / metrics.fontSize))
    ),
  };
}

function getHeadingLayout(node: JSONContent, metrics: PaginationMetrics) {
  const level = node.attrs?.level || 1;
  const text = extractInlineText(node);
  const scale = level === 1 ? 1.55 : level === 2 ? 1.28 : 1.12;
  const fontSize = Math.round(metrics.fontSize * scale);
  const font = `bold ${fontSize}px ${metrics.fontFamily}`;
  const lineHeightPx = Math.round(fontSize * (level === 1 ? 1.22 : 1.28));
  const margin = level === 1 ? 16 : level === 2 ? 34 : 26;
  const lineRanges = wrapTextIntoLineRangesExact(text, metrics.availableWidth, font);

  return { text, font, lineHeightPx, margin, lineRanges };
}

/**
 * Splits inline content spans into two parts based on character index, preserving marks.
 */
export function splitInlineContent(
  content: JSONContent[] | undefined,
  splitCharIndex: number
): [JSONContent[], JSONContent[]] {
  if (!content || content.length === 0) return [[], []];

  const part1: JSONContent[] = [];
  const part2: JSONContent[] = [];
  let accumulated = 0;

  for (const item of content) {
    const text = item.text || "";
    const len = text.length;

    if (accumulated + len <= splitCharIndex) {
      part1.push(item);
      accumulated += len;
    } else if (accumulated >= splitCharIndex) {
      part2.push(item);
      accumulated += len;
    } else {
      // Split point falls inside this text span
      const takeChars = splitCharIndex - accumulated;
      const t1 = text.substring(0, takeChars);
      const t2 = text.substring(takeChars);

      if (t1) {
        part1.push({ ...item, text: t1 });
      }
      if (t2) {
        part2.push({ ...item, text: t2 });
      }
      accumulated += len;
    }
  }

  return [part1, part2];
}

export function estimateNodeHeightExact(
  node: JSONContent,
  metrics: PaginationMetrics
): number {
  if (!node) return 0;
  const baseFont = `${metrics.fontSize}px ${metrics.fontFamily}`;

  if (node.type === "heading") {
    const layout = getHeadingLayout(node, metrics);
    return Math.max(1, layout.lineRanges.length) * layout.lineHeightPx + layout.margin;
  }

  if (node.type === "paragraph") {
    const text = extractInlineText(node);
    const inlineMetrics = getInlineFontMetrics(node, metrics);
    if (!text.trim()) return inlineMetrics.lineHeightPx + metrics.paragraphSpacing * 0.5;
    const lines = wrapTextIntoLinesExact(text, metrics.availableWidth, inlineMetrics.font).length;
    return Math.max(1, lines) * inlineMetrics.lineHeightPx + metrics.paragraphSpacing;
  }

  if (node.type === "blockquote") {
    const text = extractTextFromContent(node);
    const quoteFont = `italic ${metrics.fontSize}px ${metrics.fontFamily}`;
    const lines = wrapTextIntoLinesExact(text, metrics.availableWidth - 36, quoteFont).length;
    // 14px top margin + 18px bottom margin + 16px padding = 48px
    return Math.max(1, lines) * metrics.lineHeightPx + 48;
  }

  if (node.type === "bulletList" || node.type === "orderedList" || node.type === "taskList") {
    let totalHeight = 16;
    if (node.content && Array.isArray(node.content)) {
      for (const item of node.content) {
        const itemText = extractTextFromContent(item);
        const lines = wrapTextIntoLinesExact(itemText, metrics.availableWidth - 28, baseFont).length;
        totalHeight += Math.max(1, lines) * metrics.lineHeightPx + 8;
      }
    }
    return totalHeight;
  }

  if (node.type === "image") {
    const customWidth = node.attrs?.width;
    const isWrap = node.attrs?.wrapMode === "wrap-left" || node.attrs?.wrapMode === "wrap-right";
    let height = Math.min(240, Math.round(metrics.availableWidth * 0.45));
    if (typeof customWidth === "number") {
      height = Math.round(customWidth * 0.65);
    } else if (typeof customWidth === "string" && customWidth.endsWith("px")) {
      height = Math.round(parseFloat(customWidth) * 0.65);
    } else if (typeof customWidth === "string" && customWidth.endsWith("%")) {
      height = Math.round(metrics.availableWidth * (parseFloat(customWidth) / 100) * 0.65);
    }
    const captionHeight = node.attrs?.caption ? 24 : 0;
    const total = Math.min(metrics.availableHeight, height + captionHeight + 16);
    return isWrap ? Math.round(total * 0.7) : total;
  }

  if (node.type === "horizontalRule") {
    return 24;
  }

  return metrics.lineHeightPx + metrics.paragraphSpacing;
}

/**
 * Splits a full Tiptap document content array into paginated pages.
 * Behaves like a real word processor:
 * - Uses exact browser font & layout measurements
 * - Never cuts lines in half
 * - Splits paragraphs naturally across lines when necessary, preserving marks
 * - Prevents orphan headings at bottom of pages
 * - Content never overflows page bounds
 */
export function paginateDocument(
  doc: JSONContent | null | undefined,
  book: Book
): PaginatedPage[] {
  const metrics = computePaginationMetrics(book);
  const rawNodes = doc?.content || [];

  if (rawNodes.length === 0) {
    return [
      {
        pageNumber: 1,
        nodes: [{ type: "paragraph" }],
        wordCount: 0,
        charCount: 0,
        hasContent: false,
      },
    ];
  }

  // If doc already contains page nodes, map them directly 1-to-1!
  const hasPageNodes = rawNodes.some((n) => n.type === "page");
  if (hasPageNodes) {
    const pages: PaginatedPage[] = [];
    rawNodes.forEach((node, index) => {
      if (node.type === "page") {
        const pageChildren = node.content || [];
        const pageText = extractTextFromContent({ type: "doc", content: pageChildren });
        const words = pageText.trim() ? pageText.trim().split(/\s+/).length : 0;
        pages.push({
          pageNumber: node.attrs?.pageNumber || index + 1,
          nodes: pageChildren,
          wordCount: words,
          charCount: pageText.length,
          hasContent: words > 0 || pageChildren.length > 0,
        });
      }
    });
    if (pages.length > 0) return pages;
  }

  const pages: PaginatedPage[] = [];
  let currentPageNodes: JSONContent[] = [];
  let currentPageHeight = 0;
  const baseFont = `${metrics.fontSize}px ${metrics.fontFamily}`;

  const pushCurrentPage = () => {
    if (currentPageNodes.length === 0) return;
    const pageText = extractTextFromContent({ type: "doc", content: currentPageNodes });
    const words = pageText.trim() ? pageText.trim().split(/\s+/).length : 0;
    pages.push({
      pageNumber: pages.length + 1,
      nodes: currentPageNodes,
      wordCount: words,
      charCount: pageText.length,
      hasContent: words > 0,
    });
    currentPageNodes = [];
    currentPageHeight = 0;
  };

  // Queue of nodes to process
  const queue: JSONContent[] = [...rawNodes];

  while (queue.length > 0) {
    const node = queue.shift()!;
    const remainingHeight = metrics.availableHeight - currentPageHeight;

    // 1. Heading orphan prevention: heading must fit with at least 2 lines of text
    if (node.type === "heading") {
      const headingHeight = estimateNodeHeightExact(node, metrics);
      const layout = getHeadingLayout(node, metrics);

      if (headingHeight > metrics.availableHeight) {
        if (currentPageNodes.length > 0) {
          pushCurrentPage();
          queue.unshift(node);
          continue;
        }

        const linesThatFit = Math.max(
          1,
          Math.floor((metrics.availableHeight - layout.margin) / layout.lineHeightPx)
        );
        const splitCharIndex = layout.lineRanges[linesThatFit - 1]?.end;

        if (splitCharIndex && splitCharIndex < layout.text.length) {
          const [part1Content, part2Content] = splitInlineContent(
            node.content,
            splitCharIndex
          );
          currentPageNodes.push({ ...node, content: part1Content });
          currentPageHeight = metrics.availableHeight;
          pushCurrentPage();
          queue.unshift({ ...node, content: part2Content });
          continue;
        }
      }

      const neededSpace = headingHeight + 2 * metrics.lineHeightPx;

      if (remainingHeight < neededSpace && currentPageNodes.length > 0) {
        pushCurrentPage();
      }
      currentPageNodes.push(node);
      currentPageHeight += headingHeight;
      continue;
    }

    // 2. Paragraph splitting
    if (node.type === "paragraph") {
      const text = extractInlineText(node);
      const inlineMetrics = getInlineFontMetrics(node, metrics);
      if (!text.trim()) {
        const h = inlineMetrics.lineHeightPx + metrics.paragraphSpacing * 0.5;
        if (remainingHeight < h && currentPageNodes.length > 0) {
          pushCurrentPage();
        }
        currentPageNodes.push(node);
        currentPageHeight += h;
        continue;
      }

      const lineRanges = wrapTextIntoLineRangesExact(
        text,
        metrics.availableWidth,
        inlineMetrics.font
      );
      const lines = lineRanges.map((line) => line.text);
      const totalLines = lines.length;
      const fullHeight = totalLines * inlineMetrics.lineHeightPx + metrics.paragraphSpacing;

      // If full paragraph fits on current page
      if (currentPageHeight + fullHeight <= metrics.availableHeight) {
        currentPageNodes.push(node);
        currentPageHeight += fullHeight;
        continue;
      }

      // Calculate how many lines can fit on this page
      const linesThatFit = Math.floor(
        (remainingHeight - metrics.paragraphSpacing) / inlineMetrics.lineHeightPx
      );

      if (linesThatFit >= 1 && linesThatFit < totalLines) {
        const part1Text = lines.slice(0, linesThatFit).join(" ");
        const splitCharIndex = lineRanges[linesThatFit - 1].end;
        const [part1Content, part2Content] = splitInlineContent(node.content, splitCharIndex);

        const canonicalId =
          (node.attrs?.__canonicalId as string) ||
          `split-${Math.random().toString(36).substring(2, 9)}`;

        currentPageNodes.push({
          type: "paragraph",
          attrs: {
            ...node.attrs,
            __canonicalId: canonicalId,
            __splitPart: 1,
          },
          content: part1Content.length > 0 ? part1Content : [{ type: "text", text: part1Text }],
        });
        currentPageHeight += linesThatFit * inlineMetrics.lineHeightPx + metrics.paragraphSpacing;

        // Finalize current page and queue remaining text for next page
        pushCurrentPage();
        queue.unshift({
          type: "paragraph",
          attrs: {
            ...node.attrs,
            __canonicalId: canonicalId,
            __splitPart: 2,
          },
          content:
            part2Content.length > 0
              ? part2Content
              : [{ type: "text", text: lines.slice(linesThatFit).join(" ") }],
        });
        continue;
      }

      // If no lines fit on this page, push current page and put paragraph on next page
      pushCurrentPage();
      currentPageNodes.push(node);
      currentPageHeight = fullHeight;
      continue;
    }

    // 3. Lists splitting
    if (
      (node.type === "bulletList" || node.type === "orderedList" || node.type === "taskList") &&
      node.content &&
      node.content.length > 1
    ) {
      const items = [...node.content];
      const fittingItems: JSONContent[] = [];
      const overflowItems: JSONContent[] = [];
      let listRunningHeight = 16;

      for (const item of items) {
        const itemText = extractTextFromContent(item);
        const itemLines = wrapTextIntoLinesExact(itemText, metrics.availableWidth - 28, baseFont).length;
        const itemHeight = Math.max(1, itemLines) * metrics.lineHeightPx + 8;

        if (overflowItems.length === 0 && currentPageHeight + listRunningHeight + itemHeight <= metrics.availableHeight) {
          fittingItems.push(item);
          listRunningHeight += itemHeight;
        } else {
          overflowItems.push(item);
        }
      }

      if (fittingItems.length > 0 && overflowItems.length > 0) {
        currentPageNodes.push({
          type: node.type,
          attrs: node.attrs,
          content: fittingItems,
        });
        currentPageHeight += listRunningHeight;
        pushCurrentPage();

        queue.unshift({
          type: node.type,
          attrs: node.attrs,
          content: overflowItems,
        });
        continue;
      }
    }

    // 4. Other blocks (Image, Blockquote, Single List, HR)
    const blockHeight = estimateNodeHeightExact(node, metrics);

    if (currentPageHeight + blockHeight <= metrics.availableHeight || currentPageNodes.length === 0) {
      currentPageNodes.push(node);
      currentPageHeight += blockHeight;
    } else {
      pushCurrentPage();
      currentPageNodes.push(node);
      currentPageHeight = blockHeight;
    }
  }

  // Push final page
  pushCurrentPage();

  return pages.length > 0
    ? pages
    : [
        {
          pageNumber: 1,
          nodes: [{ type: "paragraph" }],
          wordCount: 0,
          charCount: 0,
          hasContent: false,
        },
      ];
}

function getJsonNodeSize(node: JSONContent): number {
  if (typeof node.text === "string") return node.text.length;
  const contentSize = (node.content ?? []).reduce(
    (total, child) => total + getJsonNodeSize(child),
    0
  );
  return node.type === "doc" ? contentSize : contentSize + 2;
}

function pushUniqueBreak(breaks: number[], position: number): void {
  if (position <= 0 || breaks[breaks.length - 1] === position) return;
  breaks.push(position);
}

/**
 * Returns ProseMirror document positions where the editable surface must begin
 * a new fixed-size sheet. Decorations use these positions without changing the
 * canonical Tiptap JSON or cursor mapping.
 */
export function computePaginationBreakPositions(
  doc: JSONContent | null | undefined,
  book: Book
): number[] {
  const metrics = computePaginationMetrics(book);
  const breaks: number[] = [];
  let currentHeight = 0;
  let nodeStart = 0;

  for (const node of doc?.content ?? []) {
    const sourceNodeStart = nodeStart;
    nodeStart += getJsonNodeSize(node);

    if (node.type === "paragraph") {
      const text = extractInlineText(node);
      const inlineMetrics = getInlineFontMetrics(node, metrics);
      const spacing = metrics.paragraphSpacing;

      if (!text.trim()) {
        const height = inlineMetrics.lineHeightPx + spacing * 0.5;
        if (currentHeight > 0 && currentHeight + height > metrics.availableHeight) {
          pushUniqueBreak(breaks, sourceNodeStart);
          currentHeight = 0;
        }
        currentHeight += height;
        continue;
      }

      const lines = wrapTextIntoLineRangesExact(
        text,
        metrics.availableWidth,
        inlineMetrics.font
      );
      let lineIndex = 0;

      while (lineIndex < lines.length) {
        let capacity = Math.floor(
          (metrics.availableHeight - currentHeight - spacing) /
            inlineMetrics.lineHeightPx
        );

        if (capacity < 1 && currentHeight > 0) {
          const position = lineIndex === 0
            ? sourceNodeStart
            : sourceNodeStart + 1 + lines[lineIndex - 1].end;
          pushUniqueBreak(breaks, position);
          currentHeight = 0;
          continue;
        }

        capacity = Math.max(1, capacity);
        const remainingLines = lines.length - lineIndex;

        if (remainingLines <= capacity) {
          currentHeight += remainingLines * inlineMetrics.lineHeightPx + spacing;
          lineIndex = lines.length;
        } else {
          const lastLineIndex = lineIndex + capacity - 1;
          pushUniqueBreak(
            breaks,
            sourceNodeStart + 1 + lines[lastLineIndex].end
          );
          lineIndex += capacity;
          currentHeight = 0;
        }
      }
      continue;
    }

    if (node.type === "heading") {
      const layout = getHeadingLayout(node, metrics);
      let lineIndex = 0;

      while (lineIndex < Math.max(1, layout.lineRanges.length)) {
        let capacity = Math.floor(
          (metrics.availableHeight - currentHeight - layout.margin) /
            layout.lineHeightPx
        );

        if (capacity < 1 && currentHeight > 0) {
          const position = lineIndex === 0
            ? sourceNodeStart
            : sourceNodeStart + 1 + layout.lineRanges[lineIndex - 1].end;
          pushUniqueBreak(breaks, position);
          currentHeight = 0;
          continue;
        }

        capacity = Math.max(1, capacity);
        const remainingLines = Math.max(1, layout.lineRanges.length) - lineIndex;

        if (remainingLines <= capacity) {
          currentHeight += remainingLines * layout.lineHeightPx + layout.margin;
          lineIndex += remainingLines;
        } else {
          const lastLineIndex = lineIndex + capacity - 1;
          pushUniqueBreak(
            breaks,
            sourceNodeStart + 1 + layout.lineRanges[lastLineIndex].end
          );
          lineIndex += capacity;
          currentHeight = 0;
        }
      }
      continue;
    }

    if (
      node.type === "bulletList" ||
      node.type === "orderedList" ||
      node.type === "taskList"
    ) {
      const baseFont = `${metrics.fontSize}px ${metrics.fontFamily}`;
      let itemPosition = sourceNodeStart + 1;
      let listHeight = 16;

      for (const item of node.content ?? []) {
        const itemText = extractTextFromContent(item);
        const lineCount = wrapTextIntoLinesExact(
          itemText,
          metrics.availableWidth - 28,
          baseFont
        ).length;
        const itemHeight = Math.max(1, lineCount) * metrics.lineHeightPx + 8;

        if (
          currentHeight > 0 &&
          currentHeight + listHeight + itemHeight > metrics.availableHeight
        ) {
          pushUniqueBreak(breaks, itemPosition === sourceNodeStart + 1
            ? sourceNodeStart
            : itemPosition);
          currentHeight = 0;
          listHeight = 16;
        }

        listHeight += itemHeight;
        itemPosition += getJsonNodeSize(item);
      }

      currentHeight += listHeight;
      continue;
    }

    const blockHeight = estimateNodeHeightExact(node, metrics);
    if (currentHeight > 0 && currentHeight + blockHeight > metrics.availableHeight) {
      pushUniqueBreak(breaks, sourceNodeStart);
      currentHeight = 0;
    }
    currentHeight += Math.min(blockHeight, metrics.availableHeight);
  }

  return breaks;
}

/**
 * Merges paginated page slices back into a canonical full Tiptap document.
 * Cleanly recombines split paragraph halves.
 */
export function mergePagesToCanonicalDoc(pages: PaginatedPage[]): JSONContent {
  const canonicalNodes: JSONContent[] = [];
  let lastNode: JSONContent | null = null;

  for (const page of pages) {
    for (const node of page.nodes) {
      const canonicalId = node.attrs?.__canonicalId as string | undefined;
      const splitPart = node.attrs?.__splitPart as number | undefined;

      if (
        canonicalId &&
        splitPart === 2 &&
        lastNode &&
        lastNode.attrs?.__canonicalId === canonicalId
      ) {
        // Merge part 2 back into lastNode
        const mergedContent = [
          ...(lastNode.content || []),
          ...(node.content || []),
        ];
        lastNode.content = mergedContent;
      } else {
        const cleanAttrs = node.attrs ? { ...node.attrs } : undefined;
        if (cleanAttrs) {
          delete cleanAttrs.__canonicalId;
          delete cleanAttrs.__splitPart;
        }

        const cleanNode: JSONContent = {
          ...node,
          attrs: cleanAttrs && Object.keys(cleanAttrs).length > 0 ? cleanAttrs : undefined,
        };
        canonicalNodes.push(cleanNode);
        lastNode = cleanNode;
      }
    }
  }

  return {
    type: "doc",
    content: canonicalNodes.length > 0 ? canonicalNodes : [{ type: "paragraph" }],
  };
}


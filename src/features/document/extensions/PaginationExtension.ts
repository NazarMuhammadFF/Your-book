import { Extension } from "@tiptap/core";
import { Node as ProseMirrorNode, Schema } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { Book, getBookPageMetrics, getBookPageMargins } from "../../books/types/book";
import { computePaginationMetrics, estimateNodeHeightExact } from "../utils/pagination";

export interface PaginationExtensionOptions {
  book: Book;
  onPageCountChange?: (pageCount: number) => void;
}

const paginationPluginKey = new PluginKey("booknotePagination");

interface WorkingPage {
  pageNumber: number;
  runningTitle: string;
  children: ProseMirrorNode[];
}

function findWordBoundaryBefore(text: string, index: number): number {
  if (index >= text.length) return text.length;
  if (index <= 0) return 0;
  if (text[index] === " " || text[index] === "\n") return index;

  const lastSpace = text.lastIndexOf(" ", index);
  if (lastSpace > 0) {
    return lastSpace;
  }
  return index;
}

/**
 * Splits a paragraph ProseMirror node into two halves preserving all marks (bold, italic, colors, etc.).
 */
function splitProseMirrorParagraph(
  schema: Schema,
  node: ProseMirrorNode,
  charIndex: number
): [ProseMirrorNode, ProseMirrorNode] | null {
  const text = node.textContent;
  if (!text || charIndex <= 0 || charIndex >= text.length) return null;

  const splitIdx = findWordBoundaryBefore(text, charIndex);
  if (splitIdx <= 0 || splitIdx >= text.length) return null;

  const slice1Nodes: ProseMirrorNode[] = [];
  const slice2Nodes: ProseMirrorNode[] = [];
  let accumulated = 0;

  node.forEach((child) => {
    const childLen = child.text?.length || 0;
    if (accumulated + childLen <= splitIdx) {
      slice1Nodes.push(child);
      accumulated += childLen;
    } else if (accumulated >= splitIdx) {
      slice2Nodes.push(child);
      accumulated += childLen;
    } else {
      const takeChars = splitIdx - accumulated;
      const t1 = (child.text || "").substring(0, takeChars);
      const t2 = (child.text || "").substring(takeChars);

      if (t1) {
        slice1Nodes.push(schema.text(t1, child.marks));
      }
      if (t2) {
        slice2Nodes.push(schema.text(t2, child.marks));
      }
      accumulated += childLen;
    }
  });

  if (slice1Nodes.length === 0 || slice2Nodes.length === 0) return null;

  const slice1 = schema.nodes.paragraph.create(node.attrs, slice1Nodes);
  const slice2 = schema.nodes.paragraph.create(node.attrs, slice2Nodes);

  return [slice1, slice2];
}

/**
 * Calculates how many characters of a paragraph element fit within remaining height.
 * Handles rich inline elements (spans, marks, strong, em).
 */
function findParagraphSplitOffset(
  pElement: HTMLElement,
  maxBottom: number
): number {
  const text = pElement.textContent || "";
  if (text.length <= 1) return 0;

  const walker = document.createTreeWalker(pElement, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    textNodes.push(current as Text);
  }

  if (textNodes.length === 0) return 0;

  const range = document.createRange();
  let low = 0;
  let high = text.length;
  let best = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    try {
      let charCount = 0;
      let targetNode: Text | null = null;
      let targetOffset = 0;

      for (const tn of textNodes) {
        const tnLen = tn.length;
        if (charCount + tnLen >= mid) {
          targetNode = tn;
          targetOffset = mid - charCount;
          break;
        }
        charCount += tnLen;
      }

      if (!targetNode) {
        targetNode = textNodes[textNodes.length - 1];
        targetOffset = targetNode.length;
      }

      range.setStart(textNodes[0], 0);
      range.setEnd(targetNode, targetOffset);
      const rect = range.getBoundingClientRect();
      if (rect.bottom <= maxBottom + 2) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    } catch {
      break;
    }
  }

  return best;
}

/**
 * When a huge overflow happens (e.g. pasting 20 paragraphs), distributes remaining nodes
 * across new pages immediately using exact font/layout metrics so all pages are created
 * at once rather than taking 20 separate animation frames.
 */
function distributeNodesIntoPages(
  nodes: ProseMirrorNode[],
  book: Book,
  startPageNumber: number,
  schema: Schema
): WorkingPage[] {
  const metrics = computePaginationMetrics(book);
  const targetPages: WorkingPage[] = [];
  let currentChildren: ProseMirrorNode[] = [];
  let currentHeight = 0;

  for (const node of nodes) {
    const nodeJson = node.toJSON();
    const estHeight = estimateNodeHeightExact(nodeJson, metrics);

    if (currentHeight + estHeight <= metrics.availableHeight || currentChildren.length === 0) {
      currentChildren.push(node);
      currentHeight += estHeight;
    } else {
      targetPages.push({
        pageNumber: startPageNumber + targetPages.length,
        runningTitle: book.title || "",
        children: currentChildren,
      });
      currentChildren = [node];
      currentHeight = estHeight;
    }
  }

  if (currentChildren.length > 0) {
    targetPages.push({
      pageNumber: startPageNumber + targetPages.length,
      runningTitle: book.title || "",
      children: currentChildren,
    });
  }

  if (targetPages.length === 0) {
    targetPages.push({
      pageNumber: startPageNumber,
      runningTitle: book.title || "",
      children: [schema.nodes.paragraph.create()],
    });
  }

  return targetPages;
}

/**
 * Core pagination reflow algorithm: runs on DOM measurements to enforce Word-like fixed page bounds.
 */
function reflowPages(
  view: EditorView,
  options: PaginationExtensionOptions
): boolean {
  const { state } = view;
  const { doc, schema } = state;
  if (doc.type.name !== "doc") return false;

  const pageMetrics = getBookPageMetrics(options.book);
  const margins = getBookPageMargins(options.book);

  const maxContentHeight = Math.max(
    140,
    pageMetrics.pageHeight - margins.top - margins.bottom
  );

  const pageDoms = Array.from(
    view.dom.querySelectorAll<HTMLElement>(".booknote-page-node")
  );
  if (pageDoms.length === 0) return false;

  // Construct working array of page nodes and their children
  const pages: WorkingPage[] = [];
  doc.forEach((pageNode, _, index) => {
    const children: ProseMirrorNode[] = [];
    pageNode.forEach((child) => children.push(child));
    pages.push({
      pageNumber: index + 1,
      runningTitle: options.book.title || "",
      children: children.length > 0 ? children : [schema.nodes.paragraph.create()],
    });
  });

  if (pages.length === 0) {
    pages.push({
      pageNumber: 1,
      runningTitle: options.book.title || "",
      children: [schema.nodes.paragraph.create()],
    });
  }

  let hasChanged = false;

  for (let p = 0; p < pages.length; p++) {
    const pageDom = pageDoms[p];
    // If no DOM exists for this page yet, it was created during this pass with accurate layout estimates.
    if (!pageDom) break;

    const pageRect = pageDom.getBoundingClientRect();
    const contentTopLimit = pageRect.top + margins.top;
    const contentBottomLimit = pageRect.bottom - margins.bottom;

    const childDoms = Array.from(pageDom.children).filter(
      (el) => !el.classList.contains("booknote-page-header") && !el.classList.contains("booknote-page-footer")
    ) as HTMLElement[];

    // 1. Check for overflow
    let overflowIndex = -1;
    for (let c = 0; c < childDoms.length; c++) {
      const childRect = childDoms[c].getBoundingClientRect();
      if (childRect.bottom > contentBottomLimit + 3) {
        overflowIndex = c;
        break;
      }
    }

    if (overflowIndex !== -1 && overflowIndex < pages[p].children.length) {
      const overflowingNode = pages[p].children[overflowIndex];
      const overflowingDom = childDoms[overflowIndex];

      // Try splitting if it's a paragraph with multiple lines
      let splitResult: [ProseMirrorNode, ProseMirrorNode] | null = null;
      if (overflowingNode.type.name === "paragraph" && overflowingDom) {
        const splitCharOffset = findParagraphSplitOffset(overflowingDom, contentBottomLimit);
        if (splitCharOffset > 10 && splitCharOffset < (overflowingNode.textContent?.length || 0) - 10) {
          splitResult = splitProseMirrorParagraph(schema, overflowingNode, splitCharOffset);
        }
      }

      const nodesToMove: ProseMirrorNode[] = [];

      if (splitResult) {
        pages[p].children[overflowIndex] = splitResult[0];
        nodesToMove.push(splitResult[1]);
        nodesToMove.push(...pages[p].children.slice(overflowIndex + 1));
        pages[p].children = pages[p].children.slice(0, overflowIndex + 1);
      } else {
        nodesToMove.push(...pages[p].children.slice(overflowIndex));
        pages[p].children = pages[p].children.slice(0, overflowIndex);
      }

      if (pages[p].children.length === 0) {
        pages[p].children.push(schema.nodes.paragraph.create());
      }

      if (p + 1 < pages.length) {
        pages[p + 1].children.unshift(...nodesToMove);
      } else {
        // Distribute all remaining overflowing nodes into newly calculated pages in one pass
        const newEstimatedPages = distributeNodesIntoPages(
          nodesToMove,
          options.book,
          p + 2,
          schema
        );
        pages.push(...newEstimatedPages);
      }

      hasChanged = true;
      continue;
    }

    // 2. Safe underflow pull-back with hysteresis guard
    if (overflowIndex === -1 && p + 1 < pages.length && pageDoms[p + 1]) {
      const lastChildDom = childDoms[childDoms.length - 1];
      const currentBottom = lastChildDom
        ? lastChildDom.getBoundingClientRect().bottom
        : contentTopLimit;
      const remainingSpace = contentBottomLimit - currentBottom;

      const nextPageDom = pageDoms[p + 1];
      const nextChildDoms = Array.from(nextPageDom.children).filter(
        (el) => !el.classList.contains("booknote-page-header") && !el.classList.contains("booknote-page-footer")
      ) as HTMLElement[];

      if (nextChildDoms.length > 0 && pages[p + 1].children.length > 0) {
        const nextFirstDom = nextChildDoms[0];
        const nextFirstHeight = nextFirstDom.getBoundingClientRect().height;

        // ONLY pull if the node fits with at least 8px margin of safety to guarantee NO overflow oscillation
        if (remainingSpace >= nextFirstHeight + 8) {
          const nextFirstNode = pages[p + 1].children[0];
          pages[p].children.push(nextFirstNode);
          pages[p + 1].children.shift();

          if (pages[p + 1].children.length === 0) {
            pages.splice(p + 1, 1);
          }

          hasChanged = true;
        }
      }
    }
  }

  // 3. Remove trailing empty pages (if more than 1 page)
  while (
    pages.length > 1 &&
    pages[pages.length - 1].children.length === 1 &&
    pages[pages.length - 1].children[0].type.name === "paragraph" &&
    !pages[pages.length - 1].children[0].textContent
  ) {
    pages.pop();
    hasChanged = true;
  }

  if (hasChanged) {
    // Reconstruct PM doc
    const newPageNodes = pages.map((page, idx) => {
      return schema.nodes.page.create(
        {
          pageNumber: idx + 1,
          runningTitle: page.runningTitle,
        },
        page.children
      );
    });

    const newDoc = schema.nodes.doc.create(null, newPageNodes);

    if (!newDoc.eq(state.doc)) {
      const tr = view.state.tr;
      tr.replaceWith(0, state.doc.content.size, newDoc.content);
      tr.setMeta(paginationPluginKey, true);
      tr.setMeta("addToHistory", false);

      view.dispatch(tr);
      options.onPageCountChange?.(pages.length);
      return true;
    }
  }

  options.onPageCountChange?.(pages.length);
  return false;
}

export const PaginationExtension = Extension.create<PaginationExtensionOptions>({
  name: "paginationExtension",

  addOptions() {
    return {
      book: {} as Book,
      onPageCountChange: undefined,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: paginationPluginKey,
        view: (editorView) => {
          let rafId: number | null = null;
          let isDestroyed = false;
          let ownDispatchPending = false;
          let reflowPassCount = 0;
          const MAX_REFLOW_PASSES = 3;

          const scheduleReflow = () => {
            if (isDestroyed) return;
            if (rafId !== null) cancelAnimationFrame(rafId);

            rafId = requestAnimationFrame(() => {
              rafId = null;
              if (isDestroyed) return;

              if (reflowPassCount >= MAX_REFLOW_PASSES) {
                reflowPassCount = 0;
                return;
              }

              reflowPassCount++;
              ownDispatchPending = true;
              const changed = reflowPages(editorView, options);
              if (!changed) {
                ownDispatchPending = false;
                reflowPassCount = 0;
              } else {
                // Schedule one follow-up RAF to verify layout on newly rendered DOM
                scheduleReflow();
              }
            });
          };

          // Initial reflow on mount
          scheduleReflow();

          return {
            update: (_view, prevState) => {
              // If this update was triggered by our own pagination dispatch, ignore
              if (ownDispatchPending) {
                ownDispatchPending = false;
                return;
              }
              // Reset pass count on genuine user edits and schedule reflow
              if (!prevState.doc.eq(_view.state.doc)) {
                reflowPassCount = 0;
                scheduleReflow();
              }
            },
            destroy: () => {
              isDestroyed = true;
              if (rafId !== null) cancelAnimationFrame(rafId);
            },
          };
        },
      }),
    ];
  },
});

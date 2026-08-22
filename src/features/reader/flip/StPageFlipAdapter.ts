import { PageFlip } from "page-flip/dist/js/page-flip.patched.js";
import "page-flip/src/Style/stPageFlip.css";
import { READER_FLIP_DURATION_MS } from "../../../design/motion";
import { BookFlipAdapter } from "./BookFlipAdapter";
import {
  BookFlipMountOptions,
  BookFlipSnapshot,
  BookFlipState,
} from "./types";

const PAGE_WIDTH = 440;
const PAGE_HEIGHT = 580;

function normalizePageIndex(pageIndex: number, pageCount: number): number {
  const lastSpreadIndex = Math.max(0, pageCount - 2);
  const boundedIndex = Math.max(0, Math.min(pageIndex, lastSpreadIndex));
  return boundedIndex - (boundedIndex % 2);
}

function mapEngineState(value: unknown): BookFlipState {
  if (value === "fold_corner") return "corner-preview";
  if (value === "user_fold") return "dragging";
  if (value === "flipping") return "flipping";
  return "idle";
}

export class StPageFlipAdapter implements BookFlipAdapter {
  private engine: PageFlip | null = null;
  private destroyed = false;
  private onSnapshotChange: ((snapshot: BookFlipSnapshot) => void) | null = null;
  private snapshot: BookFlipSnapshot = {
    currentPageIndex: 0,
    pageCount: 0,
    isAtStart: true,
    isAtEnd: true,
    state: "idle",
  };

  mount({ host, pageElements, initialPageIndex, onSnapshotChange }: BookFlipMountOptions): void {
    if (this.engine) throw new Error("Book flip adapter is already mounted");

    this.destroyed = false;
    this.onSnapshotChange = onSnapshotChange;
    const startPage = normalizePageIndex(initialPageIndex, pageElements.length);

    const engine = new PageFlip(host, {
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      size: "stretch",
      minWidth: 220,
      maxWidth: 480,
      minHeight: 290,
      maxHeight: 630,
      startPage,
      autoSize: true,
      usePortrait: false,
      showCover: false,
      drawShadow: true,
      maxShadowOpacity: 0.42,
      flippingTime: READER_FLIP_DURATION_MS,
      showPageCorners: true,
      disableFlipByClick: true,
      useMouseEvents: true,
      mobileScrollSupport: false,
    });

    this.engine = engine;
    engine.on("init", () => this.syncFromEngine("idle"));
    engine.on("update", () => this.syncFromEngine(this.snapshot.state));
    engine.on("flip", () => this.syncFromEngine("idle"));
    engine.on("changeOrientation", () => this.syncFromEngine(this.snapshot.state));
    engine.on("changeState", (event) => this.syncFromEngine(mapEngineState(event.data)));
    engine.loadFromHTML(pageElements);

    this.syncFromEngine("idle");
  }

  next(): void {
    if (!this.engine || this.snapshot.isAtEnd) return;
    this.engine.flipNext();
  }

  previous(): void {
    if (!this.engine || this.snapshot.isAtStart) return;
    this.engine.flipPrev();
  }

  goTo(pageIndex: number, animated = false): void {
    if (!this.engine) return;
    const target = normalizePageIndex(pageIndex, this.snapshot.pageCount);
    if (animated) this.engine.flip(target);
    else this.engine.turnToPage(target);
    this.syncFromEngine(this.snapshot.state);
  }

  updateLayout(): void {
    if (!this.engine || this.destroyed) return;
    this.engine.update();
    this.syncFromEngine(this.snapshot.state);
  }

  getSnapshot(): BookFlipSnapshot {
    return this.snapshot;
  }

  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.onSnapshotChange = null;
    this.engine?.destroy();
    this.engine = null;
  }

  private syncFromEngine(state: BookFlipState): void {
    if (!this.engine || this.destroyed) return;

    const pageCount = this.engine.getPageCount();
    const currentPageIndex = normalizePageIndex(
      this.engine.getCurrentPageIndex(),
      pageCount,
    );

    this.snapshot = {
      currentPageIndex,
      pageCount,
      isAtStart: currentPageIndex === 0,
      isAtEnd: currentPageIndex >= Math.max(0, pageCount - 2),
      state,
    };
    this.onSnapshotChange?.(this.snapshot);
  }
}

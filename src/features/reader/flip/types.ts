export type BookFlipState = "idle" | "dragging" | "flipping" | "corner-preview";

export interface BookFlipSnapshot {
  currentPageIndex: number;
  pageCount: number;
  isAtStart: boolean;
  isAtEnd: boolean;
  state: BookFlipState;
}

export interface BookFlipMountOptions {
  host: HTMLElement;
  pageElements: HTMLElement[];
  initialPageIndex?: number;
  pageWidth?: number;
  pageHeight?: number;
  onSnapshotChange?: (snapshot: BookFlipSnapshot) => void;
}

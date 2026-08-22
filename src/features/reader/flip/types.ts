export type BookFlipState = "idle" | "corner-preview" | "dragging" | "flipping";

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
  initialPageIndex: number;
  onSnapshotChange: (snapshot: BookFlipSnapshot) => void;
}

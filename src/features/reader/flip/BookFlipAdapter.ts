import { BookFlipMountOptions, BookFlipSnapshot } from "./types";

export interface BookFlipAdapter {
  mount(options: BookFlipMountOptions): void;
  next(): void;
  previous(): void;
  goTo(pageIndex: number, animated?: boolean): void;
  updateLayout(): void;
  getSnapshot(): BookFlipSnapshot;
  destroy(): void;
}

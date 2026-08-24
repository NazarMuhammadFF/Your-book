declare module "react-pageflip" {
  import * as React from "react";

  export interface FlipEvent {
    data: number;
    object: PageFlip;
  }

  export interface StateChangeEvent {
    data: "user_fold" | "fold_corner" | "flipping" | "read";
    object: PageFlip;
  }

  export interface PageFlip {
    getPageCount(): number;
    getCurrentPageIndex(): number;
    flipNext(corner?: "top" | "bottom"): void;
    flipPrev(corner?: "top" | "bottom"): void;
    flip(page: number, corner?: "top" | "bottom"): void;
    turnToPage(page: number): void;
    turnToNextPage(): void;
    turnToPrevPage(): void;
    destroy(): void;
  }

  export interface HTMLFlipBookProps {
    width: number;
    height: number;
    size?: "fixed" | "stretch";
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startPage?: number;
    isMouseMoveEvent?: boolean;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
    swipeDistance?: number;
    showPageCorners?: boolean;
    disableFlipByClick?: boolean;
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
    onFlip?: (e: FlipEvent) => void;
    onChangeOrientation?: (e: { data: string }) => void;
    onChangeState?: (e: StateChangeEvent) => void;
    ref?: React.Ref<FlipBookRef>;
  }

  export interface FlipBookRef {
    pageFlip(): PageFlip;
  }

  const HTMLFlipBook: React.ForwardRefExoticComponent<
    HTMLFlipBookProps & React.RefAttributes<FlipBookRef>
  >;

  export default HTMLFlipBook;
}

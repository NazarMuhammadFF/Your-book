declare module "page-flip/dist/js/page-flip.patched.js" {
  interface PageFlipEvent {
    data: unknown;
  }

  interface PageFlipSettings {
    width: number;
    height: number;
    size?: "fixed" | "stretch";
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    startPage?: number;
    autoSize?: boolean;
    usePortrait?: boolean;
    showCover?: boolean;
    drawShadow?: boolean;
    maxShadowOpacity?: number;
    flippingTime?: number;
    showPageCorners?: boolean;
    disableFlipByClick?: boolean;
    useMouseEvents?: boolean;
    mobileScrollSupport?: boolean;
  }

  export class PageFlip {
    constructor(host: HTMLElement, settings: PageFlipSettings);
    on(eventName: string, callback: (event: PageFlipEvent) => void): PageFlip;
    loadFromHTML(elements: HTMLElement[]): void;
    getPageCount(): number;
    getCurrentPageIndex(): number;
    flipNext(): void;
    flipPrev(): void;
    flip(pageIndex: number): void;
    turnToPage(pageIndex: number): void;
    update(): void;
    destroy(): void;
  }
}

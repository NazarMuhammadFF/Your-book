import { Book as IBook, getBookVisualThickness, getBookDimensions } from "../../books/types/book";

export const MAX_FALL_THICKNESS = 25; // Strict rule: only visualThickness <= 25px may lean/fall
export const FALLEN_SHELF_ANGLE = 90; // Exact horizontal angle when book is fully fallen onto the shelf
export const MIN_SHELF_HEIGHT = 230; // Minimum vertical clearance for a shelf row
export const SHELF_ZONE_PADDING = 24; // Extra vertical headroom above tallest book

export interface BookPlacement {
  bookId: string;
  rowIndex: number;
  x: number; // Offset in px from left padding (40px)
}

export interface DragPreviewTarget {
  bookId: string;
  targetRowIndex: number;
  targetX: number;
  width: number;
  height: number;
}

export interface ShelfSlotLayout {
  book: IBook;
  globalIndex: number;
  thickness: number;
  x: number; // Exact horizontal pixel offset from left padding
  gapAfter: number;
  leanAngle: number; // positive = lean right (+rotateZ), negative = lean left (-rotateZ), 0 = upright
  tallThinScore: number;
  isFallen?: boolean;
}

export interface PackedShelfRow {
  id: string;
  rowIndex: number;
  slots: ShelfSlotLayout[];
  books: IBook[];
  startIndex: number;
  maxRowHeight: number;
  zoneHeight: number; // Guaranteed exclusive vertical height of this shelf zone
  totalWidth: number;
}

interface ShelfPoint {
  x: number;
  y: number;
}

type LeanDirection = -1 | 1;

const MAX_SUPPORTED_LEAN_ANGLE = 89.5;
const LEAN_SEARCH_STEP = 0.25;
const CONTACT_TOLERANCE = 0.15;

/** Returns the visible spine rectangle after the same pivot and shelf offset used by Book. */
function getTransformedSpineBounds(
  item: { x: number; thickness: number; height: number },
  direction: LeanDirection,
  angleDegrees: number
): ShelfPoint[] {
  const angle = (angleDegrees * Math.PI) / 180;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const { x, thickness, height } = item;

  if (direction === 1) {
    return [
      { x, y: thickness * sin },
      { x: x + thickness * cos, y: 0 },
      { x: x + thickness * cos + height * sin, y: height * cos },
      { x: x + height * sin, y: height * cos + thickness * sin },
    ];
  }

  const pivotX = x + thickness;
  return [
    { x: pivotX, y: thickness * sin },
    { x: pivotX - thickness * cos, y: 0 },
    { x: pivotX - thickness * cos - height * sin, y: height * cos },
    { x: pivotX - height * sin, y: height * cos + thickness * sin },
  ];
}

function getUprightSpineBounds(item: {
  x: number;
  thickness: number;
  height: number;
}): ShelfPoint[] {
  return [
    { x: item.x, y: 0 },
    { x: item.x + item.thickness, y: 0 },
    { x: item.x + item.thickness, y: item.height },
    { x: item.x, y: item.height },
  ];
}

function polygonsTouchOrOverlap(first: ShelfPoint[], second: ShelfPoint[]): boolean {
  const polygons = [first, second];

  for (const polygon of polygons) {
    for (let index = 0; index < polygon.length; index++) {
      const point = polygon[index];
      const next = polygon[(index + 1) % polygon.length];
      const edgeX = next.x - point.x;
      const edgeY = next.y - point.y;
      const length = Math.hypot(edgeX, edgeY);
      if (length === 0) continue;

      const axisX = -edgeY / length;
      const axisY = edgeX / length;
      const project = (candidate: ShelfPoint) => candidate.x * axisX + candidate.y * axisY;
      const firstProjection = first.map(project);
      const secondProjection = second.map(project);
      const firstMin = Math.min(...firstProjection);
      const firstMax = Math.max(...firstProjection);
      const secondMin = Math.min(...secondProjection);
      const secondMax = Math.max(...secondProjection);

      if (
        firstMax < secondMin - CONTACT_TOLERANCE ||
        secondMax < firstMin - CONTACT_TOLERANCE
      ) {
        return false;
      }
    }
  }

  return true;
}

/** Finds the first physical contact angle, mirrored exactly for left and right support. */
function findSupportAngle(
  item: { x: number; thickness: number; height: number },
  support: { x: number; thickness: number; height: number },
  direction: LeanDirection
): number | null {
  const supportBounds = getUprightSpineBounds(support);
  let previousAngle = 0;

  for (
    let angle = LEAN_SEARCH_STEP;
    angle <= MAX_SUPPORTED_LEAN_ANGLE;
    angle += LEAN_SEARCH_STEP
  ) {
    const leaningBounds = getTransformedSpineBounds(item, direction, angle);
    if (!polygonsTouchOrOverlap(leaningBounds, supportBounds)) {
      previousAngle = angle;
      continue;
    }

    let low = previousAngle;
    let high = angle;
    for (let iteration = 0; iteration < 10; iteration++) {
      const midpoint = (low + high) / 2;
      if (
        polygonsTouchOrOverlap(
          getTransformedSpineBounds(item, direction, midpoint),
          supportBounds
        )
      ) {
        high = midpoint;
      } else {
        low = midpoint;
      }
    }

    return Math.round(high * 10) / 10;
  }

  return null;
}

/**
 * Deterministic hash from book ID and index to ensure stable, repeatable layout.
 */
export function getBookHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Calculates physical proportion score (height / thickness).
 */
export function getTallThinScore(book: IBook): number {
  const { height } = getBookDimensions(book);
  const thickness = getBookVisualThickness(book);
  return height / Math.max(14, thickness);
}

/**
 * Generates initial organic placements for books that don't have explicit coordinates yet.
 * Groups books into natural clusters with intentional empty gaps along shelves.
 */
export function generateInitialPlacements(
  books: IBook[],
  availableWidth: number,
  existingPlacements: Record<string, BookPlacement> = {}
): Record<string, BookPlacement> {
  const result: Record<string, BookPlacement> = { ...existingPlacements };
  let currentRow = 0;
  let currentX = 20; // Left starting offset

  // Find highest existing row
  Object.values(existingPlacements).forEach((p) => {
    if (p.rowIndex >= currentRow) {
      currentRow = p.rowIndex;
    }
  });

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    if (result[book.id]) {
      continue; // Already has placement
    }

    const thickness = getBookVisualThickness(book);
    const hash = getBookHash(book.id + i);

    // Natural clustering: every ~3-4 books create an intentional gap (~28-44px)
    const clusterMod = (hash + i) % 4;
    const gap = clusterMod === 0 ? 32 + (hash % 16) : 4 + (hash % 4);

    if (currentX + thickness + 24 > availableWidth && currentX > 40) {
      // Wrap to next shelf row
      currentRow += 1;
      currentX = 20 + (hash % 16);
    }

    result[book.id] = {
      bookId: book.id,
      rowIndex: currentRow,
      x: Math.max(0, Math.min(availableWidth - thickness, currentX)),
    };

    currentX += thickness + gap;
  }

  return result;
}

/**
 * Resolves non-overlapping positions for all books on a given shelf row.
 * If dragPreview is active on this row, smoothly shifts neighboring books to open space.
 */
export function resolveRowPlacements(
  rowBooks: IBook[],
  placements: Record<string, BookPlacement>,
  availableWidth: number,
  dragPreview?: { x: number; width: number }
): Array<{ book: IBook; x: number; thickness: number; height: number }> {
  if (rowBooks.length === 0) return [];

  // 1. Sort books by their intended X position
  const items = rowBooks.map((book) => {
    const thickness = getBookVisualThickness(book);
    const { height } = getBookDimensions(book);
    const rawX = placements[book.id]?.x ?? 0;
    const clampedX = Math.max(0, Math.min(availableWidth - thickness, rawX));
    return { book, x: clampedX, thickness, height };
  });

  items.sort((a, b) => a.x - b.x);

  // 2. If drag preview active on this row, open space around drag target
  if (dragPreview) {
    const previewStart = dragPreview.x;
    const previewEnd = dragPreview.x + dragPreview.width + 6;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemEnd = item.x + item.thickness;

      // If item overlaps the reserved drag preview zone, shift it to the right
      if (item.x < previewEnd && itemEnd > previewStart) {
        if (item.x + item.thickness / 2 >= previewStart + dragPreview.width / 2) {
          item.x = previewEnd + 2;
        } else {
          item.x = Math.max(0, previewStart - item.thickness - 2);
        }
      }
    }
    // Re-sort after drag preview shift
    items.sort((a, b) => a.x - b.x);
  }

  // 3. Prevent physical overlap from left to right with minimum 2px slit
  for (let i = 0; i < items.length - 1; i++) {
    const current = items[i];
    const next = items[i + 1];
    const minNextX = current.x + current.thickness + 2;
    if (next.x < minNextX) {
      next.x = minNextX;
    }
  }

  // 4. Prevent overflow at right boundary by shifting backwards safely
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    const maxX = availableWidth - item.thickness;
    if (item.x > maxX) {
      item.x = Math.max(0, maxX);
      // Push preceding item left if it now overlaps
      if (i > 0) {
        const prev = items[i - 1];
        const maxPrevX = item.x - prev.thickness - 2;
        if (prev.x > maxPrevX) {
          prev.x = Math.max(0, maxPrevX);
        }
      }
    }
  }

  return items;
}

/**
 * Computes shelf slot layout for a row based on physical support, runway bounds, and falling rules.
 * 
 * Rules:
 * 1. ONLY books with visualThickness <= 25px are eligible to lean/fall.
 * 2. If thickness > 25px: book remains strictly upright (0 deg).
 * 3. If supported by an adjacent book: lean angle is calculated from actual contact geometry.
 * 4. If unsupported: book can fall flat ONLY if sufficient horizontal runway exists inside its row.
 * 5. If not enough space to fall flat and no support: book remains upright.
 */
export function processRowSlots(
  resolvedItems: Array<{ book: IBook; x: number; thickness: number; height: number }>,
  startIndex: number,
  availableWidth: number
): ShelfSlotLayout[] {
  if (resolvedItems.length === 0) return [];

  const n = resolvedItems.length;

  // 1. Initial pass: build slots
  const slots: ShelfSlotLayout[] = resolvedItems.map((item, idx) => {
    const isLast = idx === n - 1;
    const nextItem = !isLast ? resolvedItems[idx + 1] : null;

    const gapAfter = nextItem
      ? Math.max(0, nextItem.x - (item.x + item.thickness))
      : Math.max(0, availableWidth - (item.x + item.thickness));

    const score = getTallThinScore(item.book);

    return {
      book: item.book,
      globalIndex: startIndex + idx,
      thickness: item.thickness,
      x: item.x,
      gapAfter,
      leanAngle: 0,
      tallThinScore: score,
      isFallen: false,
    };
  });

  // 2. Physical support and falling calculation pass

  for (let i = 0; i < n; i++) {
    const item = resolvedItems[i];
    const thickness = item.thickness;

    // Rule 1: Books with thickness > 25px NEVER lean or fall
    if (thickness > MAX_FALL_THICKNESS) {
      slots[i].leanAngle = 0;
      slots[i].isFallen = false;
      continue;
    }

    const hash = getBookHash(item.book.id + i);
    const height = item.height;

    // The same transformed-bound collision test is mirrored for both directions.
    let leftSupportAngle: number | null = null;
    if (i > 0 && resolvedItems[i - 1].thickness > MAX_FALL_THICKNESS) {
      const leftNeighbor = resolvedItems[i - 1];
      const gapLeft = item.x - (leftNeighbor.x + leftNeighbor.thickness);

      if (gapLeft >= 2) {
        const contactAngle = findSupportAngle(item, leftNeighbor, -1);
        if (contactAngle !== null) leftSupportAngle = -contactAngle;
      }
    }

    let rightSupportAngle: number | null = null;
    if (i < n - 1 && resolvedItems[i + 1].thickness > MAX_FALL_THICKNESS) {
      const rightNeighbor = resolvedItems[i + 1];
      const gapRight = rightNeighbor.x - (item.x + item.thickness);

      if (gapRight >= 2) {
        const contactAngle = findSupportAngle(item, rightNeighbor, 1);
        if (contactAngle !== null) rightSupportAngle = contactAngle;
      }
    }

    // Case A: Supported on BOTH sides -> lean towards the closer neighbor
    if (leftSupportAngle !== null && rightSupportAngle !== null) {
      if (Math.abs(leftSupportAngle) <= Math.abs(rightSupportAngle)) {
        slots[i].leanAngle = leftSupportAngle;
      } else {
        slots[i].leanAngle = rightSupportAngle;
      }
      slots[i].isFallen = false;
    }
    // Case B: Supported on Left side only
    else if (leftSupportAngle !== null) {
      slots[i].leanAngle = leftSupportAngle;
      slots[i].isFallen = false;
    }
    // Case C: Supported on Right side only
    else if (rightSupportAngle !== null) {
      slots[i].leanAngle = rightSupportAngle;
      slots[i].isFallen = false;
    }
    // Case D: UNSUPPORTED -> Check horizontal runway before falling flat
    else {
      const spaceLeft = i === 0 ? item.x : item.x - (resolvedItems[i - 1].x + resolvedItems[i - 1].thickness);
      const spaceRight = i === n - 1 ? availableWidth - (item.x + item.thickness) : resolvedItems[i + 1].x - (item.x + item.thickness);

      // A 90° rotation extends by exactly height - thickness beyond the original slot.
      // Using one mirrored requirement keeps left/right falls physically identical.
      const REQUIRED_RUNWAY = Math.max(0, height - thickness) + 2;
      const canFallRight = spaceRight >= REQUIRED_RUNWAY;
      const canFallLeft = spaceLeft >= REQUIRED_RUNWAY;

      if (canFallRight && canFallLeft) {
        // Choose direction with more open space or hash
        const fallRight = spaceRight >= spaceLeft || (hash % 2 === 0);
        slots[i].leanAngle = fallRight ? +FALLEN_SHELF_ANGLE : -FALLEN_SHELF_ANGLE;
        slots[i].isFallen = true;
      } else if (canFallRight) {
        slots[i].leanAngle = +FALLEN_SHELF_ANGLE;
        slots[i].isFallen = true;
      } else if (canFallLeft) {
        slots[i].leanAngle = -FALLEN_SHELF_ANGLE;
        slots[i].isFallen = true;
      } else {
        // Not enough runway on either side: safely remain upright
        slots[i].leanAngle = 0;
        slots[i].isFallen = false;
      }
    }
  }

  return slots;
}

/**
 * Computes full multi-shelf rows with exclusive vertical zones and collision safety.
 */
export function computeShelfRows(
  books: IBook[],
  placements: Record<string, BookPlacement>,
  containerWidth: number,
  dragPreview?: DragPreviewTarget | null
): PackedShelfRow[] {
  const paddingHorizontal = 80;
  const availableWidth = Math.max(320, containerWidth - paddingHorizontal);

  // Group books by rowIndex (excluding actively dragged book from normal placement)
  const rowMap = new Map<number, IBook[]>();
  let maxRowIndex = 0;

  for (const book of books) {
    if (dragPreview && book.id === dragPreview.bookId) {
      continue; // Handled separately via dragPreview on targetRowIndex
    }

    const placement = placements[book.id];
    const rIdx = placement ? placement.rowIndex : 0;
    maxRowIndex = Math.max(maxRowIndex, rIdx);

    if (!rowMap.has(rIdx)) {
      rowMap.set(rIdx, []);
    }
    rowMap.get(rIdx)!.push(book);
  }

  if (dragPreview) {
    maxRowIndex = Math.max(maxRowIndex, dragPreview.targetRowIndex);
  }

  const rows: PackedShelfRow[] = [];
  let globalStartIndex = 0;

  // Build rows up to maxRowIndex + 1 (at least 1 empty continuation shelf for visual polish)
  const totalRowsCount = Math.max(2, maxRowIndex + 2);

  for (let r = 0; r < totalRowsCount; r++) {
    const rowBooks = rowMap.get(r) || [];
    const isDragTargetRow = dragPreview && dragPreview.targetRowIndex === r;

    const rowDragPreview = isDragTargetRow
      ? { x: dragPreview.targetX, width: dragPreview.width }
      : undefined;

    const resolved = resolveRowPlacements(rowBooks, placements, availableWidth, rowDragPreview);
    const slots = processRowSlots(resolved, globalStartIndex, availableWidth);

    const maxBookHeight =
      rowBooks.length > 0
        ? Math.max(...rowBooks.map((b) => getBookDimensions(b).height), 220)
        : isDragTargetRow && dragPreview
        ? Math.max(dragPreview.height, 220)
        : 220;

    const maxRowHeight = Math.max(MIN_SHELF_HEIGHT, maxBookHeight);
    const zoneHeight = maxRowHeight + SHELF_ZONE_PADDING;

    const rowTotalWidth = slots.length > 0
      ? slots[slots.length - 1].x + slots[slots.length - 1].thickness
      : 0;

    rows.push({
      id: `row-${r}`,
      rowIndex: r,
      slots,
      books: rowBooks,
      startIndex: globalStartIndex,
      maxRowHeight,
      zoneHeight,
      totalWidth: rowTotalWidth,
    });

    globalStartIndex += rowBooks.length;
  }

  return rows;
}

import { Book as IBook, getBookVisualThickness, getBookDimensions } from "../../books/types/book";

export const MAX_FALL_THICKNESS = 25; // Strict rule: only visualThickness <= 25px may lean/fall flat
export const FALLEN_SHELF_ANGLE = 90; // Exact 90deg angle when book is fully fallen flat onto the shelf
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

// ============================================================================
// PHYSICS MEMORY SYSTEM - Persistent lean direction and support relationships
// ============================================================================

const STORAGE_KEY_LEAN_PREFERENCE = "booknote_lean_preference_v1";
const STORAGE_KEY_SUPPORT_GRAPH = "booknote_support_graph_v1";
const STORAGE_KEY_FALLEN_BOOKS = "booknote_fallen_books_v1";

// Global lean direction preference memory per book
// Tracks which direction each book was last leaning/falling
const leanDirectionPreference = new Map<string, LeanDirection>();

// Track which book was supporting which book (support graph)
// Key: dependent book ID, Value: support book ID
const supportGraph = new Map<string, string>();

// Track books that are currently fallen flat on the shelf
const fallenBooks = new Set<string>();

// Load from localStorage on module initialization
function loadPhysicsMemory(): void {
  try {
    const leanData = localStorage.getItem(STORAGE_KEY_LEAN_PREFERENCE);
    if (leanData) {
      const parsed = JSON.parse(leanData);
      Object.entries(parsed).forEach(([bookId, direction]) => {
        leanDirectionPreference.set(bookId, direction as LeanDirection);
      });
    }

    const supportData = localStorage.getItem(STORAGE_KEY_SUPPORT_GRAPH);
    if (supportData) {
      const parsed = JSON.parse(supportData);
      Object.entries(parsed).forEach(([bookId, supportId]) => {
        supportGraph.set(bookId, supportId as string);
      });
    }

    const fallenData = localStorage.getItem(STORAGE_KEY_FALLEN_BOOKS);
    if (fallenData) {
      const parsed = JSON.parse(fallenData);
      if (Array.isArray(parsed)) {
        parsed.forEach((bookId: string) => fallenBooks.add(bookId));
      }
    }
  } catch (e) {
    console.warn("Failed to load physics memory from localStorage:", e);
  }
}

// Save to localStorage
function savePhysicsMemory(): void {
  try {
    const leanObj = Object.fromEntries(leanDirectionPreference);
    localStorage.setItem(STORAGE_KEY_LEAN_PREFERENCE, JSON.stringify(leanObj));

    const supportObj = Object.fromEntries(supportGraph);
    localStorage.setItem(STORAGE_KEY_SUPPORT_GRAPH, JSON.stringify(supportObj));

    const fallenArr = Array.from(fallenBooks);
    localStorage.setItem(STORAGE_KEY_FALLEN_BOOKS, JSON.stringify(fallenArr));
  } catch (e) {
    console.warn("Failed to save physics memory to localStorage:", e);
  }
}

// Initialize on module load
loadPhysicsMemory();

/**
 * Records support relationship: bookId is leaning on supportId
 */
function recordSupportRelation(bookId: string, supportId: string, direction: LeanDirection): void {
  supportGraph.set(bookId, supportId);
  leanDirectionPreference.set(bookId, direction);
  fallenBooks.delete(bookId);
  savePhysicsMemory();
}

/**
 * Records fallen relationship: bookId has fallen flat in given direction
 */
function recordFallenBook(bookId: string, direction: LeanDirection): void {
  supportGraph.delete(bookId);
  leanDirectionPreference.set(bookId, direction);
  fallenBooks.add(bookId);
  savePhysicsMemory();
}

/**
 * Check if book's support is still valid (support book still exists at expected position)
 */
function isSupportStillValid(
  bookId: string,
  resolvedItems: Array<{ book: IBook; x: number; thickness: number; height: number }>,
  currentIndex: number
): boolean {
  const supportBookId = supportGraph.get(bookId);
  if (!supportBookId) return false;
  
  const preferredDirection = leanDirectionPreference.get(bookId);
  if (!preferredDirection) return false;
  
  // Find support book in current layout
  const supportIndex = resolvedItems.findIndex(item => item.book.id === supportBookId);
  if (supportIndex === -1) return false; // Support book removed/moved to different row
  
  // Check if support is still adjacent in the correct direction
  if (preferredDirection === 1) {
    // Was leaning right, check if support is still the right neighbor
    return supportIndex === currentIndex + 1;
  } else {
    // Was leaning left, check if support is still the left neighbor
    return supportIndex === currentIndex - 1;
  }
}

/**
 * Clear support relation when book falls or becomes upright
 */
function clearSupportRelation(bookId: string): void {
  supportGraph.delete(bookId);
  savePhysicsMemory();
}

/**
 * Export function to reset all preferences (useful on drag start or major changes)
 */
export function resetPhysicsMemory(): void {
  leanDirectionPreference.clear();
  supportGraph.clear();
  fallenBooks.clear();
  try {
    localStorage.removeItem(STORAGE_KEY_LEAN_PREFERENCE);
    localStorage.removeItem(STORAGE_KEY_SUPPORT_GRAPH);
    localStorage.removeItem(STORAGE_KEY_FALLEN_BOOKS);
  } catch (e) {
    console.warn("Failed to clear physics memory from localStorage:", e);
  }
}

// ponytail: ceiling = only clears direct support, not cascade chains where
// downstream books depend on this book's lean. upgrade path: BFS walk
// supportGraph to clear transitive dependents.
export function clearBookSupport(bookId: string): void {
  clearSupportRelation(bookId);
  leanDirectionPreference.delete(bookId);
  fallenBooks.delete(bookId);
  savePhysicsMemory();
}

/**
 * Clean up orphaned entries (books that no longer exist)
 */
export function cleanupPhysicsMemory(existingBookIds: Set<string>): void {
  let changed = false;
  
  // Clean lean preferences
  for (const bookId of leanDirectionPreference.keys()) {
    if (!existingBookIds.has(bookId)) {
      leanDirectionPreference.delete(bookId);
      changed = true;
    }
  }
  
  // Clean support graph
  for (const [bookId, supportId] of supportGraph.entries()) {
    if (!existingBookIds.has(bookId) || !existingBookIds.has(supportId)) {
      supportGraph.delete(bookId);
      changed = true;
    }
  }

  // Clean fallen books
  for (const bookId of fallenBooks) {
    if (!existingBookIds.has(bookId)) {
      fallenBooks.delete(bookId);
      changed = true;
    }
  }
  
  if (changed) {
    savePhysicsMemory();
  }
}

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

function getSpineBoundsAtAngle(
  item: { x: number; thickness: number; height: number },
  angleDegrees: number
): ShelfPoint[] {
  if (angleDegrees === 0) {
    return getUprightSpineBounds(item);
  }
  const direction: LeanDirection = angleDegrees > 0 ? 1 : -1;
  return getTransformedSpineBounds(item, direction, Math.abs(angleDegrees));
}

/** Finds the first physical contact angle against a support (which may be upright or leaning). */
function findSupportAngle(
  item: { x: number; thickness: number; height: number },
  support: { x: number; thickness: number; height: number },
  direction: LeanDirection,
  supportAngle: number = 0
): number | null {
  const supportBounds = getSpineBoundsAtAngle(support, supportAngle);
  let previousAngle = 0;

  const startAngle =
    direction === (supportAngle >= 0 ? 1 : -1) && supportAngle !== 0
      ? Math.abs(supportAngle)
      : LEAN_SEARCH_STEP;

  for (
    let angle = startAngle;
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
 * Shared compaction passes over one ordered shelf row.
 * Forward pass: pushes overlapping successors right, ONLY as far as physically
 * required — untouched rows keep their exact original spacing.
 * Backward pass: full cascade pulling the tail back inside the right boundary.
 */
function compactRow<T extends { x: number; thickness: number }>(
  items: T[],
  availableWidth: number
): void {
  // NOTE: callers must supply items in ascending x order — sorting here would
  // destroy the intentional positional insertion of the drop target.
  // Forward: prevent overlap left-to-right with minimum 2px slit
  for (let i = 0; i < items.length - 1; i++) {
    const minNextX = items[i].x + items[i].thickness + 2;
    if (items[i + 1].x < minNextX) {
      items[i + 1].x = minNextX;
    }
  }

  // Backward: prevent right-boundary overflow, cascading fully leftward
  for (let i = items.length - 1; i >= 0; i--) {
    const limit =
      i < items.length - 1
        ? items[i + 1].x - items[i].thickness - 2
        : availableWidth - items[i].thickness;
    if (items[i].x > limit) {
      items[i].x = Math.max(0, limit);
    }
  }
}

/**
 * Resolves non-overlapping positions for all books on a given shelf row.
 * Books keep their exact positions unless something physically overlaps.
 * If dragPreview is active on this row, the drop point joins the row as a
 * virtual item so crowded neighbors shift aside minimally (insertion behavior)
 * while free/loose areas remain completely undisturbed.
 */
export function resolveRowPlacements(
  rowBooks: IBook[],
  placements: Record<string, BookPlacement>,
  availableWidth: number,
  dragPreview?: { x: number; width: number }
): Array<{ book: IBook; x: number; thickness: number; height: number }> {
  if (rowBooks.length === 0) return [];

  type RowItem = {
    book: IBook | null;
    x: number;
    thickness: number;
    height: number;
  };

  // 1. Collect books sorted by their intended X position
  const items: RowItem[] = rowBooks.map((book) => {
    const thickness = getBookVisualThickness(book);
    const { height } = getBookDimensions(book);
    const rawX = placements[book.id]?.x ?? 0;
    const clampedX = Math.max(0, Math.min(availableWidth - thickness, rawX));
    return { book, x: clampedX, thickness, height };
  });

  // 2. Drop target joins the row positionally: inserted BEFORE the first book
  // whose body extends past the drop point. Crowded neighbors therefore shift
  // right just enough to open the gap exactly under the cursor, while drops in
  // free or loose areas leave every neighbor untouched.
  if (dragPreview) {
    const dropX = Math.max(
      0,
      Math.min(availableWidth - dragPreview.width, dragPreview.x)
    );
    let insertIndex = items.findIndex((item) => item.x + item.thickness > dropX);
    if (insertIndex === -1) insertIndex = items.length;
    items.splice(insertIndex, 0, {
      book: null,
      x: dropX,
      thickness: dragPreview.width,
      height: 0,
    });
  }

  compactRow(items, availableWidth);

  return items.filter(
    (item): item is { book: IBook; x: number; thickness: number; height: number } =>
      item.book !== null
  );
}

/**
 * Returns the final committed X for a dropped book, consistent with the same
 * minimal-displacement compaction used for the rest of the row.
 */
export function resolveDropPlacementX(
  resolvedItems: Array<{ x: number; thickness: number }>,
  previewX: number,
  dropThickness: number,
  availableWidth: number
): number {
  const items: Array<{ x: number; thickness: number; isDrop?: boolean }> =
    resolvedItems.map((item) => ({ x: item.x, thickness: item.thickness }));
  const dropX = Math.max(0, Math.min(availableWidth - dropThickness, previewX));
  let insertIndex = items.findIndex((item) => item.x + item.thickness > dropX);
  if (insertIndex === -1) insertIndex = items.length;
  items.splice(insertIndex, 0, {
    x: dropX,
    thickness: dropThickness,
    isDrop: true,
  });
  compactRow(items, availableWidth);
  return items.find((item) => item.isDrop)?.x ?? previewX;
}

/**
 * Computes shelf slot layout for a row based on physical support, runway bounds, and falling rules.
 * 
 * Rules:
 * 1. ONLY books with visualThickness <= 25px are eligible to lean/fall flat.
 * 2. If thickness > 25px: book remains strictly upright (0 deg).
 * 3. If supported by an adjacent book: lean angle is calculated from actual contact geometry.
 * 4. If unsupported: book can fall flat (90 deg) ONLY if sufficient horizontal runway exists inside its row.
/**
 * Calculates the exact non-intersecting tilt angle when a book falls onto a fallen/stacking neighbor.
 * Uses trigonometry to ensure the bottom face of the leaning book rests precisely on the top corner/edge
 * of the neighbor without penetrating through its volume.
 */
function computeStackingAngle(
  item: { x: number; thickness: number; height: number },
  neighbor: { x: number; thickness: number; height: number },
  direction: LeanDirection,
  _neighborAngle: number = 90
): number {
  const deltaX = direction === 1
    ? Math.max(1, neighbor.x - item.x)
    : Math.max(1, (item.x + item.thickness) - (neighbor.x + neighbor.thickness));

  const supportThickness = Math.max(14, neighbor.thickness);

  // If item cannot reach neighbor, it falls fully flat to 90 deg
  if (deltaX >= item.height) {
    return FALLEN_SHELF_ANGLE;
  }

  const angleRad = Math.atan2(deltaX, supportThickness);
  const angleDeg = (angleRad * 180) / Math.PI;

  // Clamp between realistic stacking angle range (e.g. 45 deg to 88 deg)
  const clampedAngle = Math.min(88, Math.max(45, Math.round(angleDeg * 10) / 10));
  return clampedAngle;
}

/**
 * Calculates effective horizontal runway to the right, taking into account
 * that books already fallen flat to the right are horizontal on the shelf surface and do not block stacking.
 */
function getEffectiveRunwayRight(
  index: number,
  resolvedItems: Array<{ book: IBook; x: number; thickness: number; height: number }>,
  slots: ShelfSlotLayout[],
  availableWidth: number
): number {
  const current = resolvedItems[index];
  const startX = current.x + current.thickness;
  const n = resolvedItems.length;

  for (let j = index + 1; j < n; j++) {
    const neighbor = resolvedItems[j];
    const neighborSlot = slots[j];

    // If this neighbor is fallen flat to the right, it's lying flat on the shelf surface,
    // so it doesn't block books from falling flat and stacking over it.
    if (neighborSlot?.isFallen && neighborSlot.leanAngle > 0) {
      continue;
    }

    // Otherwise, this neighbor is upright or leaning towards us, which limits our runway.
    return Math.max(0, neighbor.x - startX);
  }

  // No upright obstacles to the right: runway extends to the shelf boundary.
  return Math.max(0, availableWidth - startX);
}

/**
 * Calculates effective horizontal runway to the left, taking into account
 * that books already fallen flat to the left are horizontal on the shelf surface and do not block stacking.
 */
function getEffectiveRunwayLeft(
  index: number,
  resolvedItems: Array<{ book: IBook; x: number; thickness: number; height: number }>,
  slots: ShelfSlotLayout[],
  _availableWidth: number
): number {
  const current = resolvedItems[index];
  const startX = current.x;

  for (let j = index - 1; j >= 0; j--) {
    const neighbor = resolvedItems[j];
    const neighborSlot = slots[j];

    // If this neighbor is fallen flat to the left, it's lying flat on the shelf surface,
    // so it doesn't block books from falling flat and stacking over it.
    if (neighborSlot?.isFallen && neighborSlot.leanAngle < 0) {
      continue;
    }

    // Otherwise, this neighbor is upright or leaning towards us, which limits our runway.
    return Math.max(0, startX - (neighbor.x + neighbor.thickness));
  }

  // No upright obstacles to the left: runway extends to the left shelf boundary (x = 0).
  return Math.max(0, startX);
}

/**
 * Computes shelf slot layout for a row based on physical support, runway bounds, and falling rules.
 * 
 * Rules:
 * 1. ONLY books with visualThickness <= 25px are eligible to lean/fall flat.
 * 2. If thickness > 25px: book remains strictly upright (0 deg).
 * 3. If supported by an adjacent upright/tilted book: lean angle is calculated from actual contact geometry.
 * 4. If next to a fallen book in the same direction: book falls and stacks at a non-penetrating tilt angle.
 * 5. If unsupported: book can fall flat (90 deg) ONLY if sufficient horizontal runway exists inside its row.
 * 6. If not enough space to fall flat and no support: book remains upright.
 */
export function processRowSlots(
  resolvedItems: Array<{ book: IBook; x: number; thickness: number; height: number }>,
  startIndex: number,
  availableWidth: number
): ShelfSlotLayout[] {
  if (resolvedItems.length === 0) return [];

  const n = resolvedItems.length;

  // 1. Initial pass: build base slots
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

  // 2. Support Validation & Fallen State Pass:
  // - Preserves books that are already fallen flat if runway still exists
  // - For books whose support was removed, forces them to fall in their leaning direction
  for (let i = 0; i < n; i++) {
    const item = resolvedItems[i];
    const bookId = item.book.id;
    const thickness = item.thickness;
    const height = item.height;

    // Skip if book is too thick to lean anyway
    if (thickness > MAX_FALL_THICKNESS) {
      slots[i].leanAngle = 0;
      slots[i].isFallen = false;
      continue;
    }

    const REQUIRED_RUNWAY = Math.max(0, height - thickness) + 2;

    // Case 2A: Book was already marked as fallen flat
    if (fallenBooks.has(bookId)) {
      const preferredDir = leanDirectionPreference.get(bookId) || 1;
      const runwayRight = getEffectiveRunwayRight(i, resolvedItems, slots, availableWidth);
      const runwayLeft = getEffectiveRunwayLeft(i, resolvedItems, slots, availableWidth);

      const rightNeighborSlot = i < n - 1 ? slots[i + 1] : null;
      const isRightNeighborFallen = rightNeighborSlot?.isFallen && rightNeighborSlot.leanAngle > 0;
      const canStackRightOnFallen = isRightNeighborFallen && runwayRight >= REQUIRED_RUNWAY;

      const leftNeighborSlot = i > 0 ? slots[i - 1] : null;
      const isLeftNeighborFallen = leftNeighborSlot?.isFallen && leftNeighborSlot.leanAngle < 0;
      const canStackLeftOnFallen = isLeftNeighborFallen && runwayLeft >= REQUIRED_RUNWAY;

      const canStayFallen =
        (preferredDir === 1 && (canStackRightOnFallen || runwayRight >= REQUIRED_RUNWAY)) ||
        (preferredDir === -1 && (canStackLeftOnFallen || runwayLeft >= REQUIRED_RUNWAY));

      if (canStayFallen) {
        let angle = FALLEN_SHELF_ANGLE;
        if (preferredDir === 1 && canStackRightOnFallen && i < n - 1) {
          angle = computeStackingAngle(item, resolvedItems[i + 1], 1, rightNeighborSlot?.leanAngle || 90);
        } else if (preferredDir === -1 && canStackLeftOnFallen && i > 0) {
          angle = computeStackingAngle(item, resolvedItems[i - 1], -1, leftNeighborSlot?.leanAngle || -90);
        }
        slots[i].leanAngle = preferredDir * angle;
        slots[i].isFallen = true;
        continue;
      } else {
        // Space was crowded out by new upright books: stand up and recalculate
        fallenBooks.delete(bookId);
      }
    }

    // Case 2B: Book had a support relationship
    if (supportGraph.has(bookId)) {
      const stillValid = isSupportStillValid(bookId, resolvedItems, i);

      if (stillValid) {
        // Support is STILL VALID! Pre-calculate and preserve active support lean angle immediately
        const preferredDir = leanDirectionPreference.get(bookId) || 1;
        if (preferredDir === 1 && i < n - 1) {
          const contactAngle = findSupportAngle(item, resolvedItems[i + 1], 1, slots[i + 1]?.leanAngle || 0);
          if (contactAngle !== null && contactAngle <= 35) {
            slots[i].leanAngle = contactAngle;
            slots[i].isFallen = false;
            continue;
          }
        } else if (preferredDir === -1 && i > 0) {
          const contactAngle = findSupportAngle(item, resolvedItems[i - 1], -1, slots[i - 1]?.leanAngle || 0);
          if (contactAngle !== null && contactAngle <= 35) {
            slots[i].leanAngle = -contactAngle;
            slots[i].isFallen = false;
            continue;
          }
        }
      } else {
        // Support is gone! In accordance with directional inertia, the book MUST fall in its leaning direction
        const preferredDir = leanDirectionPreference.get(bookId) || 1;
        const runwayRight = getEffectiveRunwayRight(i, resolvedItems, slots, availableWidth);
        const runwayLeft = getEffectiveRunwayLeft(i, resolvedItems, slots, availableWidth);

        const rightNeighborSlot = i < n - 1 ? slots[i + 1] : null;
        const isRightNeighborFallen = rightNeighborSlot?.isFallen && rightNeighborSlot.leanAngle > 0;
        const canStackRightOnFallen = isRightNeighborFallen && runwayRight >= REQUIRED_RUNWAY;

        const leftNeighborSlot = i > 0 ? slots[i - 1] : null;
        const isLeftNeighborFallen = leftNeighborSlot?.isFallen && leftNeighborSlot.leanAngle < 0;
        const canStackLeftOnFallen = isLeftNeighborFallen && runwayLeft >= REQUIRED_RUNWAY;

        const canFallInPreferredDir =
          (preferredDir === 1 && (canStackRightOnFallen || runwayRight >= REQUIRED_RUNWAY)) ||
          (preferredDir === -1 && (canStackLeftOnFallen || runwayLeft >= REQUIRED_RUNWAY));

        if (canFallInPreferredDir) {
          let angle = FALLEN_SHELF_ANGLE;
          if (preferredDir === 1 && canStackRightOnFallen && i < n - 1) {
            angle = computeStackingAngle(item, resolvedItems[i + 1], 1, rightNeighborSlot?.leanAngle || 90);
          } else if (preferredDir === -1 && canStackLeftOnFallen && i > 0) {
            angle = computeStackingAngle(item, resolvedItems[i - 1], -1, leftNeighborSlot?.leanAngle || -90);
          }
          slots[i].leanAngle = preferredDir * angle;
          slots[i].isFallen = true;
          recordFallenBook(bookId, preferredDir);
          continue;
        } else {
          // Cannot fall flat due to tight runway: keep direction preference but clear support
          clearSupportRelation(bookId);
        }
      }
    }
  }

  // 3. Physical support and falling calculation pass
  for (let i = 0; i < n; i++) {
    const item = resolvedItems[i];
    const thickness = item.thickness;
    const height = item.height;

    // Skip if already resolved in Pass 2 (e.g. fallen flat or active supported lean)
    if (slots[i].isFallen || slots[i].leanAngle !== 0) continue;

    // Rule 1: Books with thickness > 25px NEVER lean or fall
    if (thickness > MAX_FALL_THICKNESS) {
      slots[i].leanAngle = 0;
      slots[i].isFallen = false;
      continue;
    }

    const gapLeft = i > 0
      ? item.x - (resolvedItems[i - 1].x + resolvedItems[i - 1].thickness)
      : item.x;
    const gapRight = i < n - 1
      ? resolvedItems[i + 1].x - (item.x + item.thickness)
      : availableWidth - (item.x + item.thickness);

    // Rule 2: Tightly packed interior book (gap <= 4px on both sides) stays upright
    if (i > 0 && i < n - 1 && gapLeft <= 4 && gapRight <= 4) {
      slots[i].leanAngle = 0;
      slots[i].isFallen = false;
      continue;
    }

    const REQUIRED_RUNWAY = Math.max(0, height - thickness) + 2;
    const runwayRight = getEffectiveRunwayRight(i, resolvedItems, slots, availableWidth);
    const runwayLeft = getEffectiveRunwayLeft(i, resolvedItems, slots, availableWidth);

    // Check neighbors: if adjacent neighbor is fallen flat, a book leaning that way stacks flat on top!
    const rightNeighborSlot = i < n - 1 ? slots[i + 1] : null;
    const isRightNeighborFallen = rightNeighborSlot?.isFallen && rightNeighborSlot.leanAngle > 0;
    const canStackRightOnFallen = isRightNeighborFallen && runwayRight >= REQUIRED_RUNWAY;

    const leftNeighborSlot = i > 0 ? slots[i - 1] : null;
    const isLeftNeighborFallen = leftNeighborSlot?.isFallen && leftNeighborSlot.leanAngle < 0;
    const canStackLeftOnFallen = isLeftNeighborFallen && runwayLeft >= REQUIRED_RUNWAY;

    // Calculate potential contact angles with non-fallen adjacent neighbors
    let leftSupportAngle: number | null = null;
    if (i > 0 && gapLeft >= 2 && !isLeftNeighborFallen) {
      const leftNeighbor = resolvedItems[i - 1];
      const contactAngle = findSupportAngle(item, leftNeighbor, -1, leftNeighborSlot?.leanAngle || 0);
      if (contactAngle !== null && contactAngle <= 35) {
        leftSupportAngle = -contactAngle;
      }
    }

    let rightSupportAngle: number | null = null;
    if (i < n - 1 && gapRight >= 2 && !isRightNeighborFallen) {
      const rightNeighbor = resolvedItems[i + 1];
      const contactAngle = findSupportAngle(item, rightNeighbor, 1, rightNeighborSlot?.leanAngle || 0);
      if (contactAngle !== null && contactAngle <= 35) {
        rightSupportAngle = contactAngle;
      }
    }

    const existingSupportId = supportGraph.get(item.book.id);
    const preferredDir = leanDirectionPreference.get(item.book.id);

    // Case 3A: Book ALREADY has an active valid support in supportGraph
    if (existingSupportId) {
      if (i < n - 1 && existingSupportId === resolvedItems[i + 1].book.id && rightSupportAngle !== null) {
        slots[i].leanAngle = rightSupportAngle;
        slots[i].isFallen = false;
        recordSupportRelation(item.book.id, resolvedItems[i + 1].book.id, 1);
        continue;
      }
      if (i > 0 && existingSupportId === resolvedItems[i - 1].book.id && leftSupportAngle !== null) {
        slots[i].leanAngle = leftSupportAngle;
        slots[i].isFallen = false;
        recordSupportRelation(item.book.id, resolvedItems[i - 1].book.id, -1);
        continue;
      }
    }

    // Case 3B: Book had a preferred lean direction (directional inertia)
    if (preferredDir === 1) {
      if (rightSupportAngle !== null) {
        slots[i].leanAngle = rightSupportAngle;
        slots[i].isFallen = false;
        recordSupportRelation(item.book.id, resolvedItems[i + 1].book.id, 1);
      } else if (canStackRightOnFallen || runwayRight >= REQUIRED_RUNWAY) {
        const fallAngle = canStackRightOnFallen && i < n - 1
          ? computeStackingAngle(item, resolvedItems[i + 1], 1, rightNeighborSlot?.leanAngle || 90)
          : FALLEN_SHELF_ANGLE;
        slots[i].leanAngle = +fallAngle;
        slots[i].isFallen = true;
        recordFallenBook(item.book.id, 1);
      } else {
        slots[i].leanAngle = 0;
        slots[i].isFallen = false;
        clearSupportRelation(item.book.id);
      }
      continue;
    } else if (preferredDir === -1) {
      if (leftSupportAngle !== null) {
        slots[i].leanAngle = leftSupportAngle;
        slots[i].isFallen = false;
        recordSupportRelation(item.book.id, resolvedItems[i - 1].book.id, -1);
      } else if (canStackLeftOnFallen || runwayLeft >= REQUIRED_RUNWAY) {
        const fallAngle = canStackLeftOnFallen && i > 0
          ? computeStackingAngle(item, resolvedItems[i - 1], -1, leftNeighborSlot?.leanAngle || -90)
          : FALLEN_SHELF_ANGLE;
        slots[i].leanAngle = -fallAngle;
        slots[i].isFallen = true;
        recordFallenBook(item.book.id, -1);
      } else {
        slots[i].leanAngle = 0;
        slots[i].isFallen = false;
        clearSupportRelation(item.book.id);
      }
      continue;
    }

    // Case 3C: Brand-new neutral book
    // 1. If adjacent to a fallen book in the open runway direction: fall and stack flat on top!
    if (canStackRightOnFallen && !canStackLeftOnFallen) {
      const fallAngle = computeStackingAngle(item, resolvedItems[i + 1], 1, rightNeighborSlot?.leanAngle || 90);
      slots[i].leanAngle = +fallAngle;
      slots[i].isFallen = true;
      recordFallenBook(item.book.id, 1);
      continue;
    } else if (canStackLeftOnFallen && !canStackRightOnFallen) {
      const fallAngle = computeStackingAngle(item, resolvedItems[i - 1], -1, leftNeighborSlot?.leanAngle || -90);
      slots[i].leanAngle = -fallAngle;
      slots[i].isFallen = true;
      recordFallenBook(item.book.id, -1);
      continue;
    }

    // 2. Normal neighbor contact support:
    if (leftSupportAngle !== null && rightSupportAngle !== null) {
      if (Math.abs(leftSupportAngle) <= Math.abs(rightSupportAngle)) {
        slots[i].leanAngle = leftSupportAngle;
        recordSupportRelation(item.book.id, resolvedItems[i - 1].book.id, -1);
      } else {
        slots[i].leanAngle = rightSupportAngle;
        recordSupportRelation(item.book.id, resolvedItems[i + 1].book.id, 1);
      }
      slots[i].isFallen = false;
    } else if (leftSupportAngle !== null) {
      slots[i].leanAngle = leftSupportAngle;
      slots[i].isFallen = false;
      recordSupportRelation(item.book.id, resolvedItems[i - 1].book.id, -1);
    } else if (rightSupportAngle !== null) {
      slots[i].leanAngle = rightSupportAngle;
      slots[i].isFallen = false;
      recordSupportRelation(item.book.id, resolvedItems[i + 1].book.id, 1);
    } else {
      // Completely unsupported: check runway to fall flat
      const canFallRight = canStackRightOnFallen || runwayRight >= REQUIRED_RUNWAY;
      const canFallLeft = canStackLeftOnFallen || runwayLeft >= REQUIRED_RUNWAY;

      if (canFallRight && canFallLeft) {
        // When placed in an open area with ample runway on both sides,
        // choose fall direction randomly (50/50 left or right) so it doesn't always fall right.
        const dir: LeanDirection = Math.random() < 0.5 ? 1 : -1;
        const fallAngle = dir === 1 && canStackRightOnFallen && i < n - 1
          ? computeStackingAngle(item, resolvedItems[i + 1], 1, rightNeighborSlot?.leanAngle || 90)
          : dir === -1 && canStackLeftOnFallen && i > 0
          ? computeStackingAngle(item, resolvedItems[i - 1], -1, leftNeighborSlot?.leanAngle || -90)
          : FALLEN_SHELF_ANGLE;
        slots[i].leanAngle = dir * fallAngle;
        slots[i].isFallen = true;
        recordFallenBook(item.book.id, dir);
      } else if (canFallRight) {
        const fallAngle = canStackRightOnFallen && i < n - 1
          ? computeStackingAngle(item, resolvedItems[i + 1], 1, rightNeighborSlot?.leanAngle || 90)
          : FALLEN_SHELF_ANGLE;
        slots[i].leanAngle = +fallAngle;
        slots[i].isFallen = true;
        recordFallenBook(item.book.id, 1);
      } else if (canFallLeft) {
        const fallAngle = canStackLeftOnFallen && i > 0
          ? computeStackingAngle(item, resolvedItems[i - 1], -1, leftNeighborSlot?.leanAngle || -90)
          : FALLEN_SHELF_ANGLE;
        slots[i].leanAngle = -fallAngle;
        slots[i].isFallen = true;
        recordFallenBook(item.book.id, -1);
      } else {
        slots[i].leanAngle = 0;
        slots[i].isFallen = false;
        clearSupportRelation(item.book.id);
      }
    }
  }

  // 4. Opposing collision resolution pass (prevent any "X" intersection between adjacent books)
  for (let i = 0; i < n - 1; i++) {
    const current = slots[i];
    const next = slots[i + 1];

    // If book i leans RIGHT and book i+1 leans LEFT, they would cross each other into an "X" shape
    if (current.leanAngle > 0 && next.leanAngle < 0 && !current.isFallen && !next.isFallen) {
      const itemA = resolvedItems[i];
      const itemB = resolvedItems[i + 1];
      const aHasSupport = supportGraph.has(itemA.book.id) && isSupportStillValid(itemA.book.id, resolvedItems, i);
      const bHasSupport = supportGraph.has(itemB.book.id) && isSupportStillValid(itemB.book.id, resolvedItems, i + 1);

      if (aHasSupport && !bHasSupport) {
        // Book i has active support; Book i+1 is unanchored, so Book i+1 stands upright
        next.leanAngle = 0;
        next.isFallen = false;
        clearSupportRelation(itemB.book.id);
        continue;
      } else if (bHasSupport && !aHasSupport) {
        // Book i+1 has active support; Book i is unanchored, so Book i stands upright
        current.leanAngle = 0;
        current.isFallen = false;
        clearSupportRelation(itemA.book.id);
        continue;
      }

      const conflictHash = getBookHash(itemA.book.id + itemB.book.id + i);
      const chooseLeftUpright =
        itemA.thickness > itemB.thickness
          ? true
          : itemB.thickness > itemA.thickness
          ? false
          : conflictHash % 2 === 0;

      if (chooseLeftUpright) {
        // Book i stands upright; Book i+1 leans left onto Book i
        current.leanAngle = 0;
        current.isFallen = false;
        clearSupportRelation(itemA.book.id);
        const contactAngle = findSupportAngle(itemB, itemA, -1);
        next.leanAngle = contactAngle !== null ? -contactAngle : 0;
        next.isFallen = false;
        if (contactAngle !== null) {
          recordSupportRelation(itemB.book.id, itemA.book.id, -1);
        }
      } else {
        // Book i+1 stands upright; Book i leans right onto Book i+1
        next.leanAngle = 0;
        next.isFallen = false;
        clearSupportRelation(itemB.book.id);
        const contactAngle = findSupportAngle(itemA, itemB, 1);
        current.leanAngle = contactAngle !== null ? contactAngle : 0;
        current.isFallen = false;
        if (contactAngle !== null) {
          recordSupportRelation(itemA.book.id, itemB.book.id, 1);
        }
      }
    }
  }

  // 5. Cascade / Domino Stack Propagation Pass
  // Handles sequential chain-leaning or stacking on top of fallen books
  for (let i = n - 2; i >= 0; i--) {
    const nextSlot = slots[i + 1];
    const currentItem = resolvedItems[i];
    const nextItem = resolvedItems[i + 1];

    // Books with active leftward support should never be pulled right
    const hasOppositeSupport = slots[i].leanAngle < 0 && supportGraph.has(currentItem.book.id);
    if (hasOppositeSupport) continue;

    if (nextSlot.leanAngle > 0 && currentItem.thickness <= MAX_FALL_THICKNESS) {
      // If current book already has active rightward support, keep it intact
      if (slots[i].leanAngle > 0 && supportGraph.has(currentItem.book.id)) {
        continue;
      }

      if (nextSlot.isFallen) {
        const runwayRight = getEffectiveRunwayRight(i, resolvedItems, slots, availableWidth);
        const REQUIRED_RUNWAY = Math.max(0, currentItem.height - currentItem.thickness) + 2;
        if (runwayRight >= REQUIRED_RUNWAY) {
          const fallAngle = computeStackingAngle(currentItem, nextItem, 1, nextSlot.leanAngle);
          slots[i].leanAngle = +fallAngle;
          slots[i].isFallen = true;
          recordFallenBook(currentItem.book.id, 1);
        }
      } else {
        const gapRight = nextItem.x - (currentItem.x + currentItem.thickness);
        if (gapRight <= 55) {
          const contactAngle = findSupportAngle(currentItem, nextItem, 1, nextSlot.leanAngle);
          if (contactAngle !== null && contactAngle <= 35) {
            slots[i].leanAngle = contactAngle;
            slots[i].isFallen = false;
            recordSupportRelation(currentItem.book.id, nextItem.book.id, 1);
          }
        }
      }
    }
  }

  for (let i = 1; i < n; i++) {
    const prevSlot = slots[i - 1];
    const currentItem = resolvedItems[i];
    const prevItem = resolvedItems[i - 1];

    // Books with active rightward support should never be pulled left
    const hasOppositeSupport = slots[i].leanAngle > 0 && supportGraph.has(currentItem.book.id);
    if (hasOppositeSupport) continue;

    if (prevSlot.leanAngle < 0 && currentItem.thickness <= MAX_FALL_THICKNESS) {
      // If current book already has active leftward support, keep it intact
      if (slots[i].leanAngle < 0 && supportGraph.has(currentItem.book.id)) {
        continue;
      }

      if (prevSlot.isFallen) {
        const runwayLeft = getEffectiveRunwayLeft(i, resolvedItems, slots, availableWidth);
        const REQUIRED_RUNWAY = Math.max(0, currentItem.height - currentItem.thickness) + 2;
        if (runwayLeft >= REQUIRED_RUNWAY) {
          const fallAngle = computeStackingAngle(currentItem, prevItem, -1, prevSlot.leanAngle);
          slots[i].leanAngle = -fallAngle;
          slots[i].isFallen = true;
          recordFallenBook(currentItem.book.id, -1);
        }
      } else {
        const gapLeft = currentItem.x - (prevItem.x + prevItem.thickness);
        if (gapLeft <= 55) {
          const contactAngle = findSupportAngle(currentItem, prevItem, -1, prevSlot.leanAngle);
          if (contactAngle !== null && contactAngle <= 35) {
            slots[i].leanAngle = -contactAngle;
            slots[i].isFallen = false;
            recordSupportRelation(currentItem.book.id, prevItem.book.id, -1);
          }
        }
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

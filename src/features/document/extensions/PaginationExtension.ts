import { Extension, JSONContent } from "@tiptap/core";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, EditorView } from "@tiptap/pm/view";

export interface PaginationExtensionOptions {
  pageHeight: number;
  pageGap: number;
  contentTop: number;
  contentBottom: number;
  lineHeightPx: number;
  getBreakPositions: (doc: JSONContent) => number[];
  onPageCountChange?: (pageCount: number) => void;
}

interface PaginationPluginState {
  decorations: DecorationSet;
  positions: number[];
}

const paginationPluginKey = new PluginKey<PaginationPluginState>("booknotePagination");

function createPluginState(
  doc: ProseMirrorNode,
  options: PaginationExtensionOptions,
  positions = options.getBreakPositions(doc.toJSON())
): PaginationPluginState {
  const safePositions = positions.filter(
    (position) => position > 0 && position < doc.content.size
  );
  const decorations = safePositions.map((position, index) =>
    Decoration.widget(
      position,
      () => {
        const element = document.createElement("span");
        element.className = "booknote-page-break";
        element.dataset.pageBreakIndex = String(index + 1);
        element.contentEditable = "false";
        element.setAttribute("aria-hidden", "true");
        return element;
      },
      { key: `booknote-page-break-${index}-${position}`, side: -1 }
    )
  );

  return {
    decorations: DecorationSet.create(doc, decorations),
    positions: safePositions,
  };
}

function snapToWordBoundary(
  doc: ProseMirrorNode,
  position: number,
  minimumPosition: number
): number {
  const resolved = doc.resolve(position);
  if (!resolved.parent.isTextblock || resolved.parentOffset === 0) return position;

  const textBefore = resolved.parent.textBetween(0, resolved.parentOffset, " ", " ");
  const whitespaceIndex = Math.max(
    textBefore.lastIndexOf(" "),
    textBefore.lastIndexOf("\n"),
    textBefore.lastIndexOf("\t")
  );
  if (whitespaceIndex < 0) return position;

  const snapped = resolved.start() + whitespaceIndex + 1;
  return snapped > minimumPosition ? snapped : position;
}

function measureBreakPositions(
  view: EditorView,
  options: PaginationExtensionOptions
): number[] {
  const root = view.dom as HTMLElement;
  const existingBreaks = Array.from(
    root.querySelectorAll<HTMLElement>(".booknote-page-break")
  );

  for (const pageBreak of existingBreaks) {
    pageBreak.style.display = "none";
    pageBreak.style.height = "0px";
  }
  void root.offsetHeight;

  const doc = view.state.doc;
  const documentEnd = doc.content.size;
  const rootTop = root.getBoundingClientRect().top;
  const contentHeight = Math.max(
    1,
    options.pageHeight - options.contentTop - options.contentBottom
  );
  const documentBottom = view.coordsAtPos(documentEnd).bottom;
  const breaks: number[] = [];
  let pageBottom = rootTop + options.contentTop + contentHeight;
  let minimumPosition = 0;

  while (pageBottom < documentBottom - 1 && minimumPosition < documentEnd - 1) {
    let low = minimumPosition + 1;
    let high = documentEnd - 1;
    let bestPosition = minimumPosition;

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const coordinates = view.coordsAtPos(middle);
      if (coordinates.bottom <= pageBottom) {
        bestPosition = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    if (bestPosition <= minimumPosition) bestPosition = minimumPosition + 1;
    const snappedPosition = snapToWordBoundary(doc, bestPosition, minimumPosition);
    breaks.push(snappedPosition);
    minimumPosition = snappedPosition;
    pageBottom += contentHeight;
  }

  return breaks;
}

function alignBreaksToSheets(
  view: EditorView,
  options: PaginationExtensionOptions
): void {
  const root = view.dom as HTMLElement;
  const breaks = Array.from(
    root.querySelectorAll<HTMLElement>(".booknote-page-break")
  );

  for (const pageBreak of breaks) {
    pageBreak.style.display = "";
    pageBreak.style.height = "0px";
  }
  void root.offsetHeight;

  const rootTop = root.getBoundingClientRect().top;
  for (const pageBreak of breaks) {
    const pageIndex = Number(pageBreak.dataset.pageBreakIndex);
    const inlineBaselineCompensation = Math.max(
      0,
      (options.contentTop - options.lineHeightPx) / 2
    );
    const targetTop =
      pageIndex * (options.pageHeight + options.pageGap) +
      options.contentTop +
      inlineBaselineCompensation;
    const currentTop = pageBreak.getBoundingClientRect().top - rootTop;
    pageBreak.style.height = `${Math.max(options.pageGap, targetTop - currentTop)}px`;
  }
}

function positionsMatch(left: number[], right: number[]): boolean {
  return left.length === right.length &&
    left.every((position, index) => position === right[index]);
}

export const PaginationExtension = Extension.create<PaginationExtensionOptions>({
  name: "booknotePagination",

  addOptions() {
    return {
      pageHeight: 585,
      pageGap: 40,
      contentTop: 79,
      contentBottom: 71,
      lineHeightPx: 28,
      getBreakPositions: () => [],
      onPageCountChange: undefined,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin<PaginationPluginState>({
        key: paginationPluginKey,
        state: {
          init: (_, state) => createPluginState(state.doc, options),
          apply: (transaction, previous) => {
            const measuredPositions = transaction.getMeta(paginationPluginKey) as
              | number[]
              | undefined;
            if (measuredPositions) {
              return createPluginState(transaction.doc, options, measuredPositions);
            }
            if (transaction.docChanged) {
              return createPluginState(transaction.doc, options);
            }
            return {
              positions: previous.positions,
              decorations: previous.decorations.map(
                transaction.mapping,
                transaction.doc
              ),
            };
          },
        },
        props: {
          decorations: (state) =>
            paginationPluginKey.getState(state)?.decorations ?? null,
        },
        view: (view) => {
          let frame: number | null = null;
          const scheduleLayout = () => {
            if (frame !== null) cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
              frame = null;
              const measuredPositions = measureBreakPositions(view, options);
              const pluginState = paginationPluginKey.getState(view.state);

              if (!pluginState || !positionsMatch(pluginState.positions, measuredPositions)) {
                view.dispatch(
                  view.state.tr
                    .setMeta(paginationPluginKey, measuredPositions)
                    .setMeta("addToHistory", false)
                );
                return;
              }

              alignBreaksToSheets(view, options);
              options.onPageCountChange?.(measuredPositions.length + 1);
            });
          };

          scheduleLayout();
          return {
            update: scheduleLayout,
            destroy: () => {
              if (frame !== null) cancelAnimationFrame(frame);
            },
          };
        },
      }),
    ];
  },
});

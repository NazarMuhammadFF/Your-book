import { useEditor, JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { CustomImageExtension } from "../extensions/CustomImageExtension";
import { FontSizeExtension } from "../extensions/FontSizeExtension";
import { PaginationExtension } from "../extensions/PaginationExtension";
import { Book } from "../../books/types/book";
import {
  computePaginationBreakPositions,
  computePaginationMetrics,
} from "../utils/pagination";

export interface UseBookEditorOptions {
  content: JSONContent;
  book: Book;
  editable?: boolean;
  onUpdate?: (content: JSONContent) => void;
  onSelectionUpdate?: () => void;
  autofocus?: boolean | "start" | "end" | "all";
  onPageCountChange?: (pageCount: number) => void;
}

export function useBookEditor({
  content,
  book,
  editable = true,
  onUpdate,
  onSelectionUpdate,
  autofocus = false,
  onPageCountChange,
}: UseBookEditorOptions) {
  const paginationMetrics = computePaginationMetrics(book);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      FontSizeExtension,
      PaginationExtension.configure({
        pageHeight: paginationMetrics.pageHeight,
        pageGap: 40,
        contentTop: paginationMetrics.contentTop,
        contentBottom: paginationMetrics.contentBottom,
        lineHeightPx: paginationMetrics.lineHeightPx,
        getBreakPositions: (document) =>
          computePaginationBreakPositions(document, book),
        onPageCountChange,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CustomImageExtension,
      Placeholder.configure({
        placeholder: `Write notes or chapter content for "${book.title}"...`,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content,
    editable,
    autofocus,
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON();
      onUpdate?.(json);
    },
    onSelectionUpdate: () => {
      onSelectionUpdate?.();
    },
    editorProps: {
      attributes: {
        class: "booknote-prose focus:outline-none",
        spellcheck: "true",
      },
    },
  }, [
    book.id,
    book.pageSettings.pageMargin,
    book.pageSettings.pageSizePreset,
    book.typography.fontFamilyId,
    book.typography.fontSize,
    book.typography.lineHeight,
    book.typography.paragraphSpacing,
    book.typography.textAlignment,
  ]);

  return editor;
}

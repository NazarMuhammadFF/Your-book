import { useEditor, JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { PageDocument } from "../extensions/PageDocument";
import { PageNode } from "../extensions/PageNode";
import { CustomImageExtension } from "../extensions/CustomImageExtension";
import { FontSizeExtension } from "../extensions/FontSizeExtension";
import { PaginationExtension } from "../extensions/PaginationExtension";
import { Book } from "../../books/types/book";
import { ensurePageDocument } from "../utils/initialContent";

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
  const normalizedContent = ensurePageDocument(content, book);

  const editor = useEditor(
    {
      extensions: [
        PageDocument,
        PageNode,
        StarterKit.configure({
          document: false, // Replaced with PageDocument
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
          book,
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
      content: normalizedContent,
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
    },
    [
      book.id,
      book.pageSettings?.pageMargin,
      book.pageSettings?.pageSizePreset,
      book.pageSettings?.margins?.top,
      book.pageSettings?.margins?.bottom,
      book.pageSettings?.margins?.left,
      book.pageSettings?.margins?.right,
      book.typography?.margins?.top,
      book.typography?.margins?.bottom,
      book.typography?.margins?.left,
      book.typography?.margins?.right,
      book.typography?.fontFamilyId,
      book.typography?.fontSize,
      book.typography?.lineHeight,
      book.typography?.paragraphSpacing,
      book.typography?.textAlignment,
    ]
  );

  return editor;
}

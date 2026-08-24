import { Node, mergeAttributes } from "@tiptap/core";

export interface PageNodeOptions {
  HTMLAttributes: Record<string, any>;
}

export const PageNode = Node.create<PageNodeOptions>({
  name: "page",
  group: "block",
  content: "block+",
  defining: true,
  isolating: false, // allows seamless backspacing and cursor transitions between pages

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      pageNumber: {
        default: 1,
        parseHTML: (element) => Number(element.getAttribute("data-page-number")) || 1,
        renderHTML: (attributes) => ({
          "data-page-number": attributes.pageNumber,
        }),
      },
      runningTitle: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-running-title") || "",
        renderHTML: (attributes) =>
          attributes.runningTitle ? { "data-running-title": attributes.runningTitle } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="page"]',
      },
      {
        tag: "div.booknote-page-node",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "page",
        class: "booknote-page-node",
      }),
      0, // Editable content hole
    ];
  },
});

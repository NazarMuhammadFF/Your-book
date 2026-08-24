import { JSONContent } from "@tiptap/react";
import { Book } from "../../books/types/book";

/**
 * Normalizes any document content so it conforms to the PageDocument schema (doc -> page+ -> block+).
 */
export function ensurePageDocument(content?: JSONContent, book?: Book): JSONContent {
  if (!content || !content.content || content.content.length === 0) {
    return createEmptyDocumentContent();
  }

  // Check if content already consists entirely of page nodes
  const hasOnlyPages = content.content.every((node) => node.type === "page");
  if (hasOnlyPages) {
    return content;
  }

  // If content has naked block nodes, wrap them into page node(s)
  const wrappedPages: JSONContent[] = [];
  let currentPageBlocks: JSONContent[] = [];
  let pageNumber = 1;

  for (const block of content.content) {
    if (block.type === "page") {
      if (currentPageBlocks.length > 0) {
        wrappedPages.push({
          type: "page",
          attrs: { pageNumber: pageNumber++, runningTitle: book?.title || "" },
          content: currentPageBlocks,
        });
        currentPageBlocks = [];
      }
      wrappedPages.push({
        ...block,
        attrs: { ...block.attrs, pageNumber: pageNumber++ },
      });
    } else {
      currentPageBlocks.push(block);
    }
  }

  if (currentPageBlocks.length > 0) {
    wrappedPages.push({
      type: "page",
      attrs: { pageNumber: pageNumber++, runningTitle: book?.title || "" },
      content: currentPageBlocks,
    });
  }

  return {
    type: "doc",
    content: wrappedPages.length > 0 ? wrappedPages : [
      {
        type: "page",
        attrs: { pageNumber: 1, runningTitle: book?.title || "" },
        content: [{ type: "paragraph" }],
      },
    ],
  };
}

/**
 * Extracts raw block nodes from a document regardless of whether it's wrapped in pages.
 */
export function extractRawBlocks(content?: JSONContent): JSONContent[] {
  if (!content || !content.content) return [];
  const blocks: JSONContent[] = [];
  for (const item of content.content) {
    if (item.type === "page" && item.content) {
      blocks.push(...item.content);
    } else {
      blocks.push(item);
    }
  }
  return blocks;
}

/**
 * Creates an empty document for new books.
 * Starts completely blank with a single page containing an empty paragraph.
 */
export function createEmptyDocumentContent(): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "page",
        attrs: { pageNumber: 1 },
        content: [
          {
            type: "paragraph",
          },
        ],
      },
    ],
  };
}

/**
 * Rich demo document content for starter books.
 */
export function createDemoDocumentContent(book?: Book): JSONContent {
  const title = book?.title || "The Architecture of Solitude";
  const subtitle = book?.subtitle || "Essays on Quiet Thinking & Spaces";

  const rawBlocks: JSONContent[] = [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: title }],
    },
    ...(subtitle
      ? [
          {
            type: "paragraph",
            attrs: { textAlign: "left" },
            content: [
              {
                type: "text",
                marks: [{ type: "italic" }],
                text: subtitle,
              },
            ],
          },
        ]
      : []),
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "CHAPTER I • The Quiet Room" }],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "justify" },
      content: [
        {
          type: "text",
          text: "There is an unspoken geometry to a room that invites writing. It does not require vast square footage or rare timber; rather, it asks only for consistency of light, a respectful distance from mechanical clamor, and the quiet dignity of bound paper resting upon a clean surface.",
        },
      ],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "justify" },
      content: [
        {
          type: "text",
          text: "When one sits before a blank page in such an environment, the mind sheds its defensive posture. The rush of momentary notifications ceases, replaced by the slower, more deliberate cadence of thought settling into prose.",
        },
      ],
    },
    {
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              marks: [{ type: "italic" }],
              text: "“Solitude is not the absence of the world, but the presence of one's own undivided attention.”",
            },
          ],
        },
      ],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "justify" },
      content: [
        {
          type: "text",
          text: "To preserve this feeling in software requires exceptional restraint. Every unnecessary toolbar, flashing badge, and over-eager suggestion chips away at the sanctuary of the desk. The digital page must breathe in quiet sympathy with its human author.",
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Maintain generous page margins to prevent visual crowding.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Choose timeless typefaces with balanced proportions.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Allow words to flow naturally before introducing rigid structure.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Establish dedicated writing routine each morning",
                },
              ],
            },
          ],
        },
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Refine chapter outline and visual draft rhythm",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "CHAPTER II • Physical Anchors" }],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "justify" },
      content: [
        {
          type: "text",
          text: "A bound book carries weight in the hand that is entirely independent of its word count. You sense how much remains unread beneath your right thumb; you feel the crisp resistance of heavy rag paper as you turn each leaf. These micro-sensations are not merely decorative—they form an unconscious cognitive map of the text.",
        },
      ],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "justify" },
      content: [
        {
          type: "text",
          text: "Digital tools often discard these physical anchors in favor of endless scrollbars and flat rectangles. Yet by reintroducing subtle depth cues—the gentle cast of a spine shadow, the soft warmth of paper grain, and the deliberate separation of pages—we restore that familiar sense of place.",
        },
      ],
    },
  ];

  return ensurePageDocument(
    {
      type: "doc",
      content: rawBlocks,
    },
    book
  );
}

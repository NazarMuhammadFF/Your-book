import { Book } from "../types/book";

export const INITIAL_MOCK_BOOKS: Book[] = [
  {
    id: "book-1",
    title: "The Architecture of Solitude",
    subtitle: "Essays on Quiet Thinking & Spaces",
    cover: {
      paletteId: "navy",
      pattern: "classic-frame",
      titleVisible: true,
      authorVisible: true,
      authorName: "Julian Vance",
      badgeText: "VOL. I",
    },
    typography: {
      fontFamilyId: "serif",
      fontSize: 17,
      lineHeight: 1.7,
      paragraphSpacing: 18,
      textAlignment: "left",
    },
    pageSettings: {
      pageMargin: "normal",
      pageSizePreset: "standard",
      showPageNumbers: true,
    },
    dimensions: {
      width: 148,
      height: 216,
      thickness: 26,
      rotationDeg: -1.2,
    },
    createdAt: "2026-03-12T09:00:00.000Z",
    updatedAt: "2026-08-20T14:30:00.000Z",
  },
  {
    id: "book-2",
    title: "Botanical Field Journal",
    subtitle: "Specimens, Flora & Alpine Observations",
    cover: {
      paletteId: "pine",
      pattern: "vintage-border",
      titleVisible: true,
      authorVisible: true,
      authorName: "Elena Rostova",
      badgeText: "FIELDWORK",
    },
    typography: {
      fontFamilyId: "serif",
      fontSize: 16,
      lineHeight: 1.65,
      paragraphSpacing: 16,
      textAlignment: "left",
    },
    pageSettings: {
      pageMargin: "spacious",
      pageSizePreset: "novel",
      showPageNumbers: true,
    },
    dimensions: {
      width: 144,
      height: 208,
      thickness: 22,
      rotationDeg: 0.9,
    },
    createdAt: "2026-04-05T11:15:00.000Z",
    updatedAt: "2026-08-18T10:20:00.000Z",
  },
  {
    id: "book-3",
    title: "Essays on Digital Craft",
    subtitle: "Tactility, Latency & Aesthetic Integrity",
    cover: {
      paletteId: "terracotta",
      pattern: "modern-geo",
      titleVisible: true,
      authorVisible: true,
      authorName: "N. H. Thorne",
      badgeText: "2026",
    },
    typography: {
      fontFamilyId: "sans",
      fontSize: 16.5,
      lineHeight: 1.65,
      paragraphSpacing: 16,
      textAlignment: "left",
    },
    pageSettings: {
      pageMargin: "normal",
      pageSizePreset: "standard",
      showPageNumbers: true,
    },
    dimensions: {
      width: 152,
      height: 212,
      thickness: 24,
      rotationDeg: -0.6,
    },
    createdAt: "2026-05-19T16:40:00.000Z",
    updatedAt: "2026-08-21T18:05:00.000Z",
  },
  {
    id: "book-4",
    title: "Wabi-Sabi & Daily Notes",
    subtitle: "Imperfect Observations on Everyday Life",
    cover: {
      paletteId: "linen",
      pattern: "minimal",
      titleVisible: true,
      authorVisible: true,
      authorName: "K. M. Aris",
      badgeText: "REFLECTIONS",
    },
    typography: {
      fontFamilyId: "serif",
      fontSize: 17,
      lineHeight: 1.75,
      paragraphSpacing: 20,
      textAlignment: "left",
    },
    pageSettings: {
      pageMargin: "spacious",
      pageSizePreset: "novel",
      showPageNumbers: true,
    },
    dimensions: {
      width: 142,
      height: 204,
      thickness: 28,
      rotationDeg: 1.3,
    },
    createdAt: "2026-06-01T08:30:00.000Z",
    updatedAt: "2026-08-15T09:45:00.000Z",
  },
  {
    id: "book-5",
    title: "Systems & Cybernetics",
    subtitle: "Feedback Loops & Dynamic Structures",
    cover: {
      paletteId: "charcoal",
      pattern: "center-badge",
      titleVisible: true,
      authorVisible: true,
      authorName: "Dr. Arthur Bell",
      badgeText: "DEPT 04",
    },
    typography: {
      fontFamilyId: "mono",
      fontSize: 15,
      lineHeight: 1.6,
      paragraphSpacing: 16,
      textAlignment: "left",
    },
    pageSettings: {
      pageMargin: "compact",
      pageSizePreset: "standard",
      showPageNumbers: true,
    },
    dimensions: {
      width: 156,
      height: 220,
      thickness: 32,
      rotationDeg: -0.8,
    },
    createdAt: "2026-06-22T13:20:00.000Z",
    updatedAt: "2026-08-11T12:00:00.000Z",
  },
  {
    id: "book-6",
    title: "Chronicles of the Old Port",
    subtitle: "Maritime Memories & Coastline Tales",
    cover: {
      paletteId: "crimson",
      pattern: "classic-frame",
      titleVisible: true,
      authorVisible: true,
      authorName: "Marcus Sterling",
      badgeText: "ARCHIVE",
    },
    typography: {
      fontFamilyId: "serif",
      fontSize: 16,
      lineHeight: 1.68,
      paragraphSpacing: 18,
      textAlignment: "left",
    },
    pageSettings: {
      pageMargin: "normal",
      pageSizePreset: "standard",
      showPageNumbers: true,
    },
    dimensions: {
      width: 146,
      height: 214,
      thickness: 20,
      rotationDeg: 0.7,
    },
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-08-04T15:20:00.000Z",
  },
  {
    id: "book-7",
    title: "Morning Reflections",
    subtitle: "Quiet Notes from the Study Desk",
    cover: {
      paletteId: "ochre",
      pattern: "minimal",
      titleVisible: true,
      authorVisible: true,
      authorName: "Clara Wood",
      badgeText: "NOTEBOOK",
    },
    typography: {
      fontFamilyId: "serif",
      fontSize: 16.5,
      lineHeight: 1.7,
      paragraphSpacing: 16,
      textAlignment: "left",
    },
    pageSettings: {
      pageMargin: "normal",
      pageSizePreset: "compact",
      showPageNumbers: true,
    },
    dimensions: {
      width: 140,
      height: 202,
      thickness: 18,
      rotationDeg: -1.4,
    },
    createdAt: "2026-07-29T07:45:00.000Z",
    updatedAt: "2026-08-22T08:10:00.000Z",
  },
];

export interface MockDocumentChapter {
  id: string;
  chapterNumber?: string;
  title: string;
  subtitle?: string;
  content: {
    type: "paragraph" | "quote" | "heading" | "list";
    text?: string;
    items?: string[];
    author?: string;
  }[];
}

export const MOCK_DOCUMENT_CONTENT: Record<string, MockDocumentChapter[]> = {
  default: [
    {
      id: "ch-1",
      chapterNumber: "CHAPTER I",
      title: "The Quiet Room",
      subtitle: "On establishing a space for continuous contemplation",
      content: [
        {
          type: "paragraph",
          text: "There is an unspoken geometry to a room that invites writing. It does not require vast square footage or rare timber; rather, it asks only for consistency of light, a respectful distance from mechanical clamor, and the quiet dignity of bound paper resting upon a clean surface.",
        },
        {
          type: "paragraph",
          text: "When one sits before a blank page in such an environment, the mind sheds its defensive posture. The rush of momentary notifications ceases, replaced by the slower, more deliberate cadence of thought settling into prose.",
        },
        {
          type: "quote",
          text: "“Solitude is not the absence of the world, but the presence of one's own undivided attention.”",
          author: "Notes on Writing, 1924",
        },
        {
          type: "paragraph",
          text: "To preserve this feeling in software requires exceptional restraint. Every unnecessary toolbar, flashing badge, and over-eager suggestion chips away at the sanctuary of the desk. The digital page must breathe in quiet sympathy with its human author.",
        },
        {
          type: "list",
          items: [
            "Maintain generous page margins to prevent visual crowding.",
            "Choose timeless typefaces with balanced proportions.",
            "Allow words to flow naturally before introducing structure.",
          ],
        },
      ],
    },
    {
      id: "ch-2",
      chapterNumber: "CHAPTER II",
      title: "The Weight of Physical Objects",
      subtitle: "Why tactile feedback anchors memory and focus",
      content: [
        {
          type: "paragraph",
          text: "A bound book carries weight in the hand that is entirely independent of its word count. You sense how much remains unread beneath your right thumb; you feel the crisp resistance of heavy rag paper as you turn each leaf. These micro-sensations are not merely decorative—they form an unconscious cognitive map of the text.",
        },
        {
          type: "paragraph",
          text: "Digital tools often discard these physical anchors in favor of endless scrollbars and flat rectangles. Yet by reintroducing subtle depth cues—the gentle cast of a spine shadow, the soft warmth of paper grain, and the deliberate separation of pages—we restore that familiar sense of place.",
        },
      ],
    },
  ],
};

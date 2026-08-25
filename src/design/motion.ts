/**
 * Centralized motion presets and transitions for BookNote.
 * Product personality: Calm — Tactile — Playful.
 */

export const READER_FLIP_DURATION_MS = 560;
export const BOOKSHELF_EXTRACT_DURATION_MS = 850;
export const BOOKSHELF_FLIP_DURATION_MS = 420;
export const BOOKSHELF_RETURN_DURATION_MS = 900;
export const BOOKSHELF_SETTLE_DURATION_MS = 380;
/** Delay sebelum buku kedua mulai ditarik keluar saat berganti buku (ms).
 * Nilai ini diatur agar buku pertama sudah hampir masuk ke rak sebelum buku kedua keluar. */
export const BOOKSHELF_SWITCH_DELAY_MS = 520;

export const transitions = {
  // Heavy physical objects (books, shelves)
  springBook: {
    type: "spring",
    mass: 1.1,
    stiffness: 240,
    damping: 22,
  },

  // Interactive UI controls (buttons, tabs, toggles)
  springControl: {
    type: "spring",
    mass: 0.45,
    stiffness: 420,
    damping: 28,
  },

  // Modal dialogs and sliding panels
  springModal: {
    type: "spring",
    mass: 0.85,
    stiffness: 300,
    damping: 26,
  },

  // Standard smooth eases
  fast: {
    duration: 0.15,
    ease: [0.16, 1, 0.3, 1],
  },
  normal: {
    duration: 0.25,
    ease: [0.16, 1, 0.3, 1],
  },
  slow: {
    duration: 0.4,
    ease: [0.16, 1, 0.3, 1],
  },

  // View transitions
  pageFade: {
    duration: 0.22,
    ease: [0.2, 0.8, 0.2, 1],
  },
  readerFlip: {
    duration: READER_FLIP_DURATION_MS / 1000,
  },
} as const;

export const motionVariants = {
  fadeInUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
  modalBackdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  modalCard: {
    initial: { opacity: 0, scale: 0.95, y: 16 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 12 },
  },
  bookHover: {
    rest: {
      y: 0,
      scale: 1,
      rotateZ: 0,
      transition: transitions.springBook,
    },
    hover: {
      y: -10,
      scale: 1.025,
      rotateZ: 0,
      transition: transitions.springBook,
    },
  },
};

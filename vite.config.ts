import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "motion/react"],
          "vendor-tiptap": [
            "@tiptap/react",
            "@tiptap/starter-kit",
            "@tiptap/extension-color",
            "@tiptap/extension-highlight",
            "@tiptap/extension-image",
            "@tiptap/extension-placeholder",
            "@tiptap/extension-task-item",
            "@tiptap/extension-task-list",
            "@tiptap/extension-text-align",
            "@tiptap/extension-text-style",
            "@tiptap/extension-underline",
          ],
          "vendor-pdf": ["pdfjs-dist"],
          "vendor-pageflip": ["page-flip", "react-pageflip"],
        },
      },
    },
  },
}));

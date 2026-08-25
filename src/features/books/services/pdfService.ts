import * as pdfjsLib from "pdfjs-dist";
import { PDFSourceMetadata } from "../types/book";

// Configure PDF.js Worker for Vite environment
if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface LoadedPDFDocument {
  doc: pdfjsLib.PDFDocumentProxy;
  totalPages: number;
}

const pdfCache = new Map<string, pdfjsLib.PDFDocumentProxy>();

/**
 * Loads a PDF document from an ArrayBuffer, Data URL, or File URL.
 */
export async function loadPDFDocument(
  source: ArrayBuffer | string
): Promise<pdfjsLib.PDFDocumentProxy> {
  const cacheKey = typeof source === "string" ? source : undefined;
  if (cacheKey && pdfCache.has(cacheKey)) {
    return pdfCache.get(cacheKey)!;
  }

  const loadingTask = pdfjsLib.getDocument(
    typeof source === "string" ? { url: source } : { data: source }
  );
  const pdfDoc = await loadingTask.promise;

  if (cacheKey) {
    pdfCache.set(cacheKey, pdfDoc);
  }

  return pdfDoc;
}

/**
 * Extracts metadata and thumbnail for cover from a PDF file.
 */
export async function processPDFFile(file: File): Promise<{
  metadata: PDFSourceMetadata;
  arrayBuffer: ArrayBuffer;
  dataUrl: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: "application/pdf" });
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const pdfDoc = await loadPDFDocument(arrayBuffer);
  const totalPages = pdfDoc.numPages;

  // Generate thumbnail from Page 1
  let coverPageThumbnail: string | undefined;
  try {
    coverPageThumbnail = await renderPDFPageToDataURL(pdfDoc, 1, 0.8);
  } catch (err) {
    console.warn("Failed to generate PDF cover thumbnail:", err);
  }

  const metadata: PDFSourceMetadata = {
    filePath: dataUrl,
    fileName: file.name,
    fileSize: file.size,
    totalPages,
    coverPageThumbnail,
  };

  return { metadata, arrayBuffer, dataUrl };
}

/**
 * Renders a specific PDF page onto a canvas element.
 */
export async function renderPDFPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  canvas: HTMLCanvasElement,
  scale = 1.5
): Promise<void> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const context = canvas.getContext("2d");
  if (!context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: context,
    viewport: viewport,
    canvas: canvas,
  } as unknown as Parameters<pdfjsLib.PDFPageProxy["render"]>[0]).promise;
}

/**
 * Renders a specific PDF page into a base64 Data URL.
 */
export async function renderPDFPageToDataURL(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  scale = 1.0
): Promise<string> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not get 2d context for thumbnail");

  await page.render({
    canvasContext: context,
    viewport: viewport,
    canvas: canvas,
  } as unknown as Parameters<pdfjsLib.PDFPageProxy["render"]>[0]).promise;

  return canvas.toDataURL("image/jpeg", 0.85);
}

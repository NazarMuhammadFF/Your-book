/**
 * Utility to optimize user-uploaded book cover images and extract dominant harmonious color palettes.
 */

export async function optimizeCoverImage(
  file: File,
  maxDimension = 1200,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Failed to read image file."));
    };

    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        reject(new Error("Empty image file content."));
        return;
      }

      const img = new Image();
      img.onerror = () => {
        reject(new Error("Failed to decode image data."));
      };

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // If image is already smaller than maxDimension, compress slightly or return
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // Fallback to original data URL if canvas 2D context is unavailable
          resolve(dataUrl);
          return;
        }

        // Draw image smoothly
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG Data URL
        const optimizedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(optimizedDataUrl);
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.min(255, Math.max(0, Math.round(x))).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

function colorDistance(
  c1: [number, number, number],
  c2: [number, number, number]
): number {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
      Math.pow(c1[1] - c2[1], 2) +
      Math.pow(c1[2] - c2[2], 2)
  );
}

/**
 * Extracts dominant and accent color palette from an image URL or Data URL.
 */
export async function extractPaletteFromImage(
  imageUrl: string,
  maxColors = 8
): Promise<string[]> {
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve([]);
      return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onerror = () => {
      resolve([]);
    };

    img.onload = () => {
      try {
        const sampleSize = 100;
        const canvas = document.createElement("canvas");
        canvas.width = sampleSize;
        canvas.height = sampleSize;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve([]);
          return;
        }

        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

        const colorCounts = new Map<string, { r: number; g: number; b: number; count: number }>();
        const step = 2; // sample every 2nd pixel for speed

        for (let i = 0; i < imageData.length; i += 4 * step) {
          const a = imageData[i + 3];
          if (a < 128) continue; // skip transparent

          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];

          // Skip extreme blown out white or pitch black
          if (r > 248 && g > 248 && b > 248) continue;
          if (r < 12 && g < 12 && b < 12) continue;

          // Quantize to 24-level bins (reduce 256 to ~10 bins per channel)
          const qr = Math.round(r / 24) * 24;
          const qg = Math.round(g / 24) * 24;
          const qb = Math.round(b / 24) * 24;
          const key = `${qr},${qg},${qb}`;

          const existing = colorCounts.get(key);
          if (existing) {
            existing.count += 1;
            existing.r = (existing.r + r) / 2;
            existing.g = (existing.g + g) / 2;
            existing.b = (existing.b + b) / 2;
          } else {
            colorCounts.set(key, { r, g, b, count: 1 });
          }
        }

        // Sort by frequency
        const sorted = Array.from(colorCounts.values()).sort(
          (a, b) => b.count - a.count
        );

        const distinctColors: [number, number, number][] = [];
        const resultHexes: string[] = [];

        for (const item of sorted) {
          const currentRgb: [number, number, number] = [
            Math.round(item.r),
            Math.round(item.g),
            Math.round(item.b),
          ];

          // Check if sufficiently different from previously selected colors
          const isDistinct = distinctColors.every(
            (c) => colorDistance(c, currentRgb) > 42
          );

          if (isDistinct) {
            distinctColors.push(currentRgb);
            resultHexes.push(rgbToHex(currentRgb[0], currentRgb[1], currentRgb[2]));
            if (resultHexes.length >= maxColors) break;
          }
        }

        resolve(resultHexes);
      } catch {
        resolve([]);
      }
    };

    img.src = imageUrl;
  });
}

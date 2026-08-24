/**
 * Utility to optimize user-uploaded book cover images.
 * Resizes large image files to high-resolution book proportions (max 1200px)
 * and compresses them to Web-safe JPEG Data URLs.
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

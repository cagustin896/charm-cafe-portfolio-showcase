// ─── Image helpers ────────────────────────────────────────────────────────────
// In single-device mode there's no file storage, so uploaded product photos are
// resized + compressed in the browser and stored as data URLs in localStorage.
// Keeping them small (max ~320px JPEG) protects the ~5MB localStorage budget.

const MAX_DIM = 320;
const JPEG_QUALITY = 0.78;

export interface ResizeResult {
  dataUrl: string;
  bytes: number;
}

export function fileToResizedDataUrl(file: File): Promise<ResizeResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That image could not be loaded'));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Image processing is not supported here'));
          return;
        }
        // White matte so transparent PNGs don't turn black as JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        // Rough byte size of the base64 payload
        const bytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
        resolve({ dataUrl, bytes });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

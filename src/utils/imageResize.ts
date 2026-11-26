import { SECURITY_DEFAULTS } from '../constants/app.ts';

/**
 * Resizes an uploaded image file to a compact square thumbnail Data URL
 * so it can be stored safely inside the encrypted vault.
 */
export function resizeImageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const maxDim = SECURITY_DEFAULTS.IMAGE_MAX_DIMENSION_PX;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/png');
        if (dataUrl.length > SECURITY_DEFAULTS.MAX_IMAGE_DATA_URL_BYTES) {
          reject(new Error('IMAGE_TOO_LARGE'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

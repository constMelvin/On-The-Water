/**
 * Turns a photo from the device into a tiny square data URL: centre-cropped to a square, downscaled to
 * 256px, exported as WebP (JPEG where WebP isn't supported), and squeezed until it is under MAX_CHARS.
 * It is only a preview until Save, which uploads it to Google Drive (`uploadProfilePhoto` in profile.ts).
 */
export const PHOTO_SIZE = 256;
const FALLBACK_SIZE = 192;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
/** About 45 KB of image. */
const MAX_CHARS = 60_000;
const QUALITIES = [0.82, 0.7, 0.6, 0.5];
/** --cream: transparent PNG corners must not turn black in a JPEG (a canvas can't read CSS variables). */
const CREAM = '#fff8f2';

/** A message already written for the person to read. */
export class PhotoError extends Error {}

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

async function decode(file: File): Promise<Decoded> {
  try {
    // 'from-image' applies the phone's EXIF rotation.
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      throw new PhotoError('Hindi mabasa ‘yang photo. Try a JPG or PNG.');
    }
  }
}

function encode(canvas: HTMLCanvasElement, quality: number): string {
  const webp = canvas.toDataURL('image/webp', quality);
  // Browsers without WebP encoding quietly hand back a PNG.
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', quality);
}

/** The photo as a small centre-cropped square data URL. Throws PhotoError with a friendly message. */
export async function processPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new PhotoError('That isn’t a photo. Try a JPG or PNG.');
  if (file.size > MAX_INPUT_BYTES) throw new PhotoError('That photo is too big. Pick one under 20 MB.');

  const img = await decode(file);
  try {
    const side = Math.min(img.width, img.height);
    if (!side) throw new PhotoError('Hindi mabasa ‘yang photo. Try a JPG or PNG.');
    const sx = (img.width - side) / 2;
    const sy = (img.height - side) / 2;

    for (const size of [PHOTO_SIZE, FALLBACK_SIZE]) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new PhotoError('This browser can’t shrink photos. Try another one.');
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = CREAM;
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img.source, sx, sy, side, side, 0, 0, size, size);
      for (const q of QUALITIES) {
        const url = encode(canvas, q);
        if (url.length <= MAX_CHARS) return url;
      }
    }
    throw new PhotoError('Hindi namin ma-shrink ‘yang photo. Try a different one.');
  } finally {
    img.release();
  }
}

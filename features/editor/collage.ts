// One numbered picture of all the photos, for the town and captions (decision 0003). Drawn in the
// browser from the local previews, so nothing extra is uploaded to our storage. Tiles are numbered
// in the order given; the model answers by number.

import { color } from '@/design-system/tokens';

const SIZE = 1024;
const QUALITY = 0.7;

function load(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    // Stored photos come from another origin; without this the canvas can't be read back.
    if (!url.startsWith('blob:')) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

/** A JPEG data URL, or null if no photo could be drawn. */
export async function buildCollage(previewUrls: string[]): Promise<string | null> {
  const columns = Math.ceil(Math.sqrt(previewUrls.length));
  const rows = Math.ceil(previewUrls.length / columns);
  const tile = Math.floor(SIZE / columns);
  const canvas = document.createElement('canvas');
  canvas.width = tile * columns;
  canvas.height = tile * rows;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.fillStyle = color('surface');
  context.fillRect(0, 0, canvas.width, canvas.height);

  const images = await Promise.all(previewUrls.map(load));
  if (images.every((image) => !image)) return null;
  images.forEach((image, index) => {
    const x = (index % columns) * tile;
    const y = Math.floor(index / columns) * tile;
    if (image) {
      // Cover-crop to a square so every tile is the same size.
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      const sx = (image.naturalWidth - side) / 2;
      const sy = (image.naturalHeight - side) / 2;
      context.drawImage(image, sx, sy, side, side, x + 2, y + 2, tile - 4, tile - 4);
    }
    const label = String(index + 1);
    const badge = Math.round(tile * 0.18);
    context.fillStyle = color('night');
    context.fillRect(x + 6, y + 6, badge, badge);
    context.fillStyle = color('on-night');
    context.font = `bold ${Math.round(badge * 0.7)}px sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, x + 6 + badge / 2, y + 6 + badge / 2);
  });
  try {
    return canvas.toDataURL('image/jpeg', QUALITY);
  } catch {
    return null; // a photo the browser wouldn't let us read back
  }
}

import exifr from 'exifr';
import { fitWithin } from './imageSize';

// Runs off the main thread so the page stays responsive on phones.
// Drawing to a canvas and re-encoding writes no EXIF, so GPS never reaches our servers in a file.

export type ProcessedImage = {
  thumb: Blob;
  display: Blob;
  export: Blob;
  width: number;
  height: number;
  takenAt: string | null;
  gps: { lat: number; lng: number } | null;
};

export type WorkerRequest = { requestId: string; file: File };
export type WorkerFailure = 'heic_unsupported' | 'unreadable';
export type WorkerResponse =
  | { requestId: string; ok: true; image: ProcessedImage }
  | { requestId: string; ok: false; reason: WorkerFailure };

const isHeic = (file: File) => /hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name);

async function encode(bitmap: ImageBitmap, maxEdge: number, type: string, quality: number): Promise<Blob> {
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No canvas');
  context.drawImage(bitmap, 0, 0, width, height);

  const blob = await canvas.convertToBlob({ type, quality });
  // Safari can't encode WebP and silently returns a PNG, which the bucket refuses.
  return blob.type === type ? blob : canvas.convertToBlob({ type: 'image/jpeg', quality });
}

async function readMetadata(file: File): Promise<Pick<ProcessedImage, 'takenAt' | 'gps'>> {
  try {
    const tags = await exifr.parse(file);
    const taken: unknown = tags?.DateTimeOriginal ?? tags?.CreateDate;
    const lat: unknown = tags?.latitude;
    const lng: unknown = tags?.longitude;
    return {
      takenAt: taken instanceof Date && !Number.isNaN(taken.getTime()) ? taken.toISOString() : null,
      gps: typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null,
    };
  } catch {
    // Plenty of photos have no readable metadata. They just aren't sorted into days automatically.
    return { takenAt: null, gps: null };
  }
}

async function processImage(file: File): Promise<ProcessedImage> {
  const metadata = await readMetadata(file);
  const bitmap = await createImageBitmap(file);
  try {
    return {
      ...metadata,
      thumb: await encode(bitmap, 400, 'image/webp', 0.75),
      display: await encode(bitmap, 1600, 'image/webp', 0.8),
      export: await encode(bitmap, 2160, 'image/jpeg', 0.9),
      width: bitmap.width,
      height: bitmap.height,
    };
  } finally {
    bitmap.close();
  }
}

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  const { requestId, file } = data;
  try {
    const response: WorkerResponse = { requestId, ok: true, image: await processImage(file) };
    self.postMessage(response);
  } catch {
    // Safari decodes HEIC itself; most other browsers can't. A converter (heic2any, loaded only
    // when needed) is a follow-up: the package can't be installed until npm is reachable.
    const reason: WorkerFailure = isHeic(file) ? 'heic_unsupported' : 'unreadable';
    const response: WorkerResponse = { requestId, ok: false, reason };
    self.postMessage(response);
  }
};

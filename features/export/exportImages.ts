// Turns the rendered frames into JPEGs and hands them to the phone (spec B §3.7): one share sheet
// with every image when the browser can share files (iOS, Android: save to Photos or post to
// Instagram), else one download per image. One image at a time: phones run out of memory otherwise.

export type FrameToSave = { node: HTMLElement; name: string; width: number; height: number };

const JPEG_QUALITY = 0.92;

async function toJpeg(frame: FrameToSave): Promise<File> {
  const { domToBlob } = await import('modern-screenshot');
  const blob = await domToBlob(frame.node, {
    type: 'image/jpeg',
    quality: JPEG_QUALITY,
    width: frame.width,
    height: frame.height,
    scale: 1,
  });
  return new File([blob], frame.name, { type: 'image/jpeg' });
}

/** Waits for fonts and every image in the frames, so nothing is captured half-loaded. */
async function ready(frames: FrameToSave[]) {
  await document.fonts.ready;
  const images = frames.flatMap((frame) => Array.from(frame.node.querySelectorAll('img')));
  await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** "share" when the share sheet opened, "download" when files were downloaded, "cancelled". */
export async function saveFrames(frames: FrameToSave[]): Promise<'share' | 'download' | 'cancelled'> {
  await ready(frames);
  const files: File[] = [];
  for (const frame of frames) files.push(await toJpeg(frame));

  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files });
      return 'share';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Some browsers refuse a share they said they could do: fall back to downloads.
    }
  }
  for (const file of files) {
    download(file);
    await new Promise((resolve) => setTimeout(resolve, 300)); // browsers drop rapid repeat downloads
  }
  return 'download';
}

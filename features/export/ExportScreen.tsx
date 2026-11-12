'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/design-system/components/Button';
import { TopBar } from '@/design-system/components/TopBar';
import { withLocalPreviews } from '@/features/editor/localPreview';
import type { TripData } from '@/lib/trip/types';
import { getTemplate } from '@/templates/registry';
import { CAROUSEL_SIZE, STORY_SIZE } from '@/templates/shared/ExportFrames';
import { getExportUrls } from './actions';
import { saveFrames, type FrameToSave } from './exportImages';

type Props = { tripKey: string; trip: TripData; templateId: string };
type Status = 'loading' | 'ready' | 'saving' | 'saved' | 'failed';

const PREVIEW_WIDTH = 160;

/** The full-size images, signed for an hour, as local blob URLs (no tainted canvas). */
async function loadExportPhotos(tripKey: string): Promise<Record<string, string>> {
  const result = await getExportUrls({ tripKey });
  if (!result.ok || !result.data.found) return {};
  const entries = await Promise.all(
    result.data.photos.map(async ({ id, url }) => {
      try {
        const response = await fetch(url);
        if (!response.ok) return null;
        return [id, URL.createObjectURL(await response.blob())] as const;
      } catch {
        return null;
      }
    }),
  );
  return Object.fromEntries(entries.filter((entry) => entry !== null));
}

/** A frame at full size, shown scaled down. The inner node is what gets saved. */
function Scaled({
  size,
  name,
  children,
}: {
  size: { width: number; height: number };
  /** The saved file's name; also marks the frame for downloadAll. */
  name: string;
  children: ReactNode;
}) {
  const scale = PREVIEW_WIDTH / size.width;
  return (
    <div
      className="shrink-0 overflow-hidden rounded-md border border-line"
      style={{ width: PREVIEW_WIDTH, height: size.height * scale }}
    >
      <div
        data-export={name}
        data-width={size.width}
        data-height={size.height}
        style={{ ...size, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {children}
      </div>
    </div>
  );
}

/** "Download for Instagram": a story and a carousel, each with the Quest's link (M17). */
export function ExportScreen({ tripKey, trip, templateId }: Props) {
  const [photos, setPhotos] = useState<Record<string, string> | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const screen = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    void loadExportPhotos(tripKey).then((loaded) => {
      if (cancelled) return;
      setPhotos(loaded);
      setStatus('ready');
    });
    return () => {
      cancelled = true;
    };
  }, [tripKey]);

  const template = getTemplate(templateId);
  const exportTrip = useMemo(() => withLocalPreviews(trip, photos ?? {}), [trip, photos]);
  const carousel = template.CarouselFrames({ trip: exportTrip });

  async function downloadAll() {
    setStatus('saving');
    const marked = Array.from(screen.current?.querySelectorAll<HTMLElement>('[data-export]') ?? []);
    const frames: FrameToSave[] = marked.flatMap((wrapper) => {
      const node = wrapper.firstElementChild;
      return node instanceof HTMLElement
        ? [
            {
              node,
              name: wrapper.dataset.export ?? 'onquest.jpg',
              width: Number(wrapper.dataset.width),
              height: Number(wrapper.dataset.height),
            },
          ]
        : [];
    });
    try {
      const outcome = await saveFrames(frames);
      setStatus(outcome === 'cancelled' ? 'ready' : 'saved');
    } catch {
      setStatus('failed');
    }
  }

  return (
    <>
      <TopBar title="Instagram" fallback={`/quests/${tripKey}/share`} />
      <main
        ref={screen}
        className="mx-auto flex min-h-svh max-w-lg flex-col gap-6 bg-surface px-4 pt-4 pb-28"
      >
        <section aria-label="Story" className="flex flex-col gap-2">
          <h2 className="text-lead font-semibold text-ink">Story</h2>
          <Scaled size={STORY_SIZE} name="onquest-story.jpg">
            <template.StoryFrame trip={exportTrip} />
          </Scaled>
        </section>

        <section aria-label="Carousel" className="flex flex-col gap-2">
          <h2 className="text-lead font-semibold text-ink">Carousel · {carousel.length} slides</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {carousel.map((frame, index) => (
              <Scaled key={index} size={CAROUSEL_SIZE} name={`onquest-${index + 1}.jpg`}>
                {frame}
              </Scaled>
            ))}
          </div>
          <p className="text-label font-normal text-ink-muted">
            Every image carries your Quest&apos;s link, so friends on Instagram can find the full trip.
          </p>
        </section>

        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface px-4 py-4">
          <div className="mx-auto flex max-w-lg flex-col gap-2">
            {status === 'failed' && (
              <p role="alert" className="text-label text-danger">
                Couldn&apos;t make the images. Try again.
              </p>
            )}
            {status === 'saved' && (
              <p role="status" className="text-label text-success">
                Saved. Post the story and carousel from Instagram.
              </p>
            )}
            <Button
              block
              disabled={status === 'loading' || status === 'saving'}
              onClick={() => void downloadAll()}
            >
              {status === 'loading'
                ? 'Getting your photos…'
                : status === 'saving'
                  ? 'Making images…'
                  : 'Download all'}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}

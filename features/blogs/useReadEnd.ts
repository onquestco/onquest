'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { createReadEndTracker } from './readEnd';

/**
 * Watches the blog's end marker (`<div data-read-end>`) with one IntersectionObserver and calls
 * `onReadEnd(seconds)` once per page view, when the marker is in view and the page has been visible
 * for 5 s (spec §3.8). Off when `enabled` is false (the writer's own view).
 */
export function useReadEnd(
  marker: RefObject<HTMLElement | null>,
  onReadEnd: (seconds: number) => void,
  enabled: boolean,
) {
  // The latest callback without restarting the count when it changes.
  const callback = useRef(onReadEnd);
  useEffect(() => {
    callback.current = onReadEnd;
  }, [onReadEnd]);

  useEffect(() => {
    const element = marker.current;
    if (!enabled || !element || typeof IntersectionObserver === 'undefined') return;

    const tracker = createReadEndTracker(
      {
        now: () => performance.now(),
        schedule: (run, ms) => {
          const timer = window.setTimeout(run, ms);
          return () => window.clearTimeout(timer);
        },
      },
      (seconds) => callback.current(seconds),
      document.visibilityState === 'visible',
    );
    const observer = new IntersectionObserver((entries) => {
      const entry = entries.at(-1);
      if (entry) tracker.markerInView(entry.isIntersecting);
    });
    observer.observe(element);
    const onVisibility = () => tracker.pageVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      tracker.stop();
    };
  }, [marker, enabled]);
}

'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A template frame drawn at its real size (1080 px wide) and scaled to fit the box it sits in,
 * so a template choice shows the template's own look, not just a photo (screen 6).
 */
export function ScaledFrame({ width, children }: { width: number; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(entry.contentRect.width / width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={box} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {scale > 0 && (
        <div style={{ width, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
      )}
    </div>
  );
}

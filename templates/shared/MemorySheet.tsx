'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { parseSheetKey, type Sheet } from './sheets';
import styles from './scrapbook.module.css';

type Open = { sheet: Sheet; photoIndex: number };

/**
 * Bottom sheet with photos + story. Opens when any element with data-opens="<key>" is
 * clicked (or a focused one gets Enter/Space). One listener for the whole page.
 */
export function MemorySheet({ sheets }: { sheets: Record<string, Sheet> }) {
  const [open, setOpen] = useState<Open | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef(0);

  const openKey = useCallback(
    (key: string) => {
      const { id, photoIndex } = parseSheetKey(key);
      const sheet = sheets[id];
      if (sheet) setOpen({ sheet, photoIndex: Math.min(photoIndex, Math.max(0, sheet.photos.length - 1)) });
    },
    [sheets],
  );

  const close = useCallback(() => setOpen(null), []);

  const step = useCallback((by: number) => {
    setOpen((current) => {
      if (!current || current.sheet.photos.length < 2) return current;
      const count = current.sheet.photos.length;
      return { ...current, photoIndex: (current.photoIndex + by + count) % count };
    });
  }, []);

  // Open from anywhere on the page.
  useEffect(() => {
    const target = (event: Event) => (event.target as Element | null)?.closest<HTMLElement>('[data-opens]');
    const onClick = (event: MouseEvent) => {
      const element = target(event);
      if (element?.dataset.opens) openKey(element.dataset.opens);
    };
    const onKey = (event: KeyboardEvent) => {
      const element = target(event);
      // Buttons already turn Enter/Space into clicks; SVG map pins don't.
      if (
        element?.dataset.opens &&
        element.tagName !== 'BUTTON' &&
        (event.key === 'Enter' || event.key === ' ')
      ) {
        event.preventDefault();
        openKey(element.dataset.opens);
      }
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [openKey]);

  // While open: lock page scroll, focus the close button, keyboard controls.
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      previousFocus?.focus();
    };
  }, [open, close, step]);

  if (!open) return null;

  const { sheet, photoIndex } = open;
  const photo = sheet.photos[photoIndex];
  const many = sheet.photos.length > 1;

  const goToMap = () => {
    close();
    document.getElementById('map')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      className={styles.sheet}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
      onClick={(event) => event.target === event.currentTarget && close()}
    >
      <div className={styles.panel}>
        <button type="button" className={styles.close} aria-label="Close" onClick={close} ref={closeButton}>
          &times;
        </button>

        {photo && (
          <div
            className={styles.sheetPhoto}
            onTouchStart={(event) => (touchStartX.current = event.touches[0]?.clientX ?? 0)}
            onTouchEnd={(event) => {
              const distance = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
              if (Math.abs(distance) > 50) step(distance < 0 ? 1 : -1);
            }}
          >
            <img src={photo.src} alt={photo.caption ?? ''} />
            {photo.caption && <p className={styles.sheetCaption}>{photo.caption}</p>}
            {many && (
              <>
                <button
                  type="button"
                  className={`${styles.sheetNav} ${styles.sheetPrev}`}
                  aria-label="Previous photo"
                  onClick={() => step(-1)}
                >
                  &#8249;
                </button>
                <button
                  type="button"
                  className={`${styles.sheetNav} ${styles.sheetNext}`}
                  aria-label="Next photo"
                  onClick={() => step(1)}
                >
                  &#8250;
                </button>
                <div className={styles.dots}>
                  {sheet.photos.map((p, i) => (
                    <i key={p.src + i} data-active={i === photoIndex ? '' : undefined} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className={styles.sheetBody}>
          <p className={styles.kicker}>{sheet.kicker}</p>
          <h3 id="sheet-title">{sheet.title}</h3>
          {sheet.text && <p>{sheet.text}</p>}
          {sheet.tags.length > 0 && (
            <div className={styles.tags}>
              {sheet.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          )}
          {sheet.quote && <p className={styles.quote}>{sheet.quote}</p>}
          {sheet.showMapLink && (
            <button type="button" className={styles.mapLink} onClick={goToMap}>
              See it on the map
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

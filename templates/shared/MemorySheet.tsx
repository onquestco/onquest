'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { parseSheetKey, type Sheet } from './sheets';
import styles from './scrapbook.module.css';

type Open = { sheet: Sheet; photoIndex: number };

/** What the reader did in the sheet, in plain words, for the app's analytics (spec analytics-v2 §6.2). */
export type MemorySheetAction = 'open' | 'next' | 'previous' | 'map';
type ActionHandler = (action: MemorySheetAction) => void;

// ScrapbookPage renders the sheet inside every template, so the app sets the callback once around
// the template instead of through each one; a prop, when given, wins. Nothing is rendered for it.
const ActionContext = createContext<ActionHandler | undefined>(undefined);

/** Gives every MemorySheet inside it an onAction callback (features/trip-page uses it). */
export function MemorySheetCallbacks({
  onAction,
  children,
}: {
  onAction: ActionHandler;
  children?: ReactNode;
}) {
  return <ActionContext.Provider value={onAction}>{children}</ActionContext.Provider>;
}

/**
 * Bottom sheet with photos + story. Opens when any element with data-opens="<key>" is
 * clicked (or a focused one gets Enter/Space). One listener for the whole page.
 */
export function MemorySheet({
  sheets,
  onAction,
}: {
  sheets: Record<string, Sheet>;
  /** Told when the sheet opens and when a button in it is used. Optional: without it nothing changes. */
  onAction?: ActionHandler;
}) {
  const [open, setOpen] = useState<Open | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef(0);
  const onActionFromApp = useContext(ActionContext);
  // A ref, so a new callback never re-runs the effects below (they move focus and lock scroll).
  const report = useRef(onAction ?? onActionFromApp);
  useEffect(() => {
    report.current = onAction ?? onActionFromApp;
  }, [onAction, onActionFromApp]);

  const openKey = useCallback(
    (key: string) => {
      const { id, photoIndex } = parseSheetKey(key);
      const sheet = sheets[id];
      if (!sheet) return;
      setOpen({ sheet, photoIndex: Math.min(photoIndex, Math.max(0, sheet.photos.length - 1)) });
      report.current?.('open');
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

    const turns = open.sheet.photos.length > 1;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') {
        step(1);
        if (turns) report.current?.('next');
      }
      if (event.key === 'ArrowLeft') {
        step(-1);
        if (turns) report.current?.('previous');
      }
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

  /** Next or previous photo from a button or a swipe (only shown when there are several). */
  const turnPhoto = (by: 1 | -1) => {
    step(by);
    if (many) report.current?.(by > 0 ? 'next' : 'previous');
  };

  const goToMap = () => {
    report.current?.('map');
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
              if (Math.abs(distance) > 50) turnPhoto(distance < 0 ? 1 : -1);
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
                  onClick={() => turnPhoto(-1)}
                >
                  &#8249;
                </button>
                <button
                  type="button"
                  className={`${styles.sheetNav} ${styles.sheetNext}`}
                  aria-label="Next photo"
                  onClick={() => turnPhoto(1)}
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
          <p className={styles.kicker}>
            {sheet.kickerLabel ? (
              <>
                <span aria-hidden="true">{sheet.kicker}</span>
                <span className={styles.visuallyHidden}>{sheet.kickerLabel}</span>
              </>
            ) : (
              sheet.kicker
            )}
          </p>
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

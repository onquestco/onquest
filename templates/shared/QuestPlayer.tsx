'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react';
import styles from './scrapbook.module.css';

// Turns server-rendered pages into a Quest you tap through. Every page stays in the HTML (SEO,
// link previews); only the current one is shown. The last page goes on to the cover, so it loops.

const SWIPE_PX = 40;
const NEXT_ZONE = 0.4; // taps on the right 60 % go forward

/**
 * One page turn, in plain words, for the app's analytics (spec analytics-v2 §6.2). The template
 * only reports it; features/trip-page decides what to send. `to` is the page landed on.
 */
export type PageTurn = {
  from: number;
  to: number;
  count: number;
  direction: 'next' | 'previous';
  via: 'tap' | 'swipe' | 'key';
  fullscreen: boolean;
};
type PageChangeHandler = (turn: PageTurn) => void;

// Templates render QuestPlayer themselves, so the app can't pass it a prop without every template
// passing one through. The app sets the same callback once around the template instead; a prop,
// when given, wins. Nothing is rendered for it, so the markup stays the same.
const PageChangeContext = createContext<PageChangeHandler | undefined>(undefined);

/** Gives every QuestPlayer inside it an onPageChange callback (features/trip-page uses it). */
export function QuestPlayerCallbacks({
  onPageChange,
  children,
}: {
  onPageChange: PageChangeHandler;
  children?: ReactNode;
}) {
  return <PageChangeContext.Provider value={onPageChange}>{children}</PageChangeContext.Provider>;
}

type Player = {
  page: number;
  count: number;
  goTo: (page: number) => void;
  next: () => void;
  previous: () => void;
  fullscreen: boolean;
  setFullscreen: (on: boolean) => void;
};

const PlayerContext = createContext<Player | null>(null);

/** Current page, controls and full screen, for the app's counter and like bar (B-03). */
export function useQuestPlayer(): Player {
  const player = useContext(PlayerContext);
  if (!player) throw new Error('useQuestPlayer must be used inside QuestPlayer');
  return player;
}

type Props = {
  /** One element per page, in reading order. */
  pages: { key: string; label: string; content: ReactNode }[];
  /** Controls placed outside the pages (full screen, like), which can call useQuestPlayer(). */
  children?: ReactNode;
  /** Told after each tap, swipe or arrow-key turn. Optional: without it nothing changes. */
  onPageChange?: PageChangeHandler;
};

export function QuestPlayer({ pages, children, onPageChange }: Props) {
  const onPageChangeFromApp = useContext(PageChangeContext);
  const reportTurn = onPageChange ?? onPageChangeFromApp;
  const [page, setPage] = useState(0);
  const count = pages.length;
  const [fullscreen, setFullscreenState] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const goTo = useCallback((target: number) => setPage(((target % count) + count) % count), [count]);

  // The Fullscreen API where it exists; iPhone Safari has none for a div, so a fixed overlay
  // (data-fullscreen in the CSS) covers the screen there. Either way the page number is kept.
  const setFullscreen = useCallback((on: boolean) => {
    const element = root.current;
    setFullscreenState(on);
    if (!element?.requestFullscreen) return;
    if (on && !document.fullscreenElement) element.requestFullscreen().catch(() => undefined);
    if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  }, []);

  useEffect(() => {
    // Escape in the browser's own full screen leaves it without calling us.
    const sync = () => {
      if (!document.fullscreenElement) setFullscreenState(false);
    };
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const player = useMemo(
    () => ({
      page,
      count,
      goTo,
      next: () => goTo(page + 1),
      previous: () => goTo(page - 1),
      fullscreen,
      setFullscreen,
    }),
    [page, count, goTo, fullscreen, setFullscreen],
  );

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const stage = root.current?.querySelector(`[data-quest-page="${page}"] [data-stage]`);
    stage?.removeAttribute('data-dropping');
    // Re-adding it on the next frame restarts the drop-in for the page coming into view.
    const frame = requestAnimationFrame(() => stage?.setAttribute('data-dropping', ''));
    return () => cancelAnimationFrame(frame);
  }, [page]);

  /** A turn by the reader: the same as next()/previous(), and reported to onPageChange. */
  function turn(direction: PageTurn['direction'], via: PageTurn['via']) {
    if (direction === 'next') player.next();
    else player.previous();
    const to = (((page + (direction === 'next' ? 1 : -1)) % count) + count) % count;
    // A one-page Quest doesn't turn.
    if (reportTurn && to !== page) reportTurn({ from: page, to, count, direction, via, fullscreen });
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const from = start.current;
    start.current = null;
    if (!from) return;
    const dx = event.clientX - from.x;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(event.clientY - from.y)) {
      return turn(dx < 0 ? 'next' : 'previous', 'swipe');
    }
    // A tap on a photo or button keeps its own meaning.
    if ((event.target as HTMLElement).closest('button, a, [data-draggable]')) return;
    const box = event.currentTarget.getBoundingClientRect();
    turn(event.clientX - box.left > box.width * NEXT_ZONE ? 'next' : 'previous', 'tap');
  }

  return (
    <PlayerContext.Provider value={player}>
      <div
        ref={root}
        className={styles.player}
        data-fullscreen={fullscreen ? '' : undefined}
        role="region"
        aria-roledescription="Quest"
        aria-label={`Page ${page + 1} of ${count}`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') turn('next', 'key');
          if (event.key === 'ArrowLeft') turn('previous', 'key');
          if (event.key === 'Escape' && fullscreen) setFullscreen(false);
        }}
        onPointerDown={(event) => {
          start.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={onPointerUp}
      >
        {/* The prototype's progress bars sit above the page, the "tap" hint under the cover. */}
        <div className={styles.playerDots} aria-hidden>
          {pages.map((item, index) => (
            <i key={item.key} data-on={index === page ? '' : undefined} />
          ))}
        </div>
        {pages.map((item, index) => (
          <section
            key={item.key}
            data-quest-page={index}
            aria-label={item.label}
            hidden={index !== page}
            className={styles.playerPage}
          >
            {item.content}
          </section>
        ))}
        {page === 0 && count > 1 && <p className={styles.playerHint}>Tap to turn the page →</p>}
        {/* Inside the player so they stay visible in full screen. */}
        {children}
      </div>
    </PlayerContext.Provider>
  );
}

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
};

export function QuestPlayer({ pages, children }: Props) {
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

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const from = start.current;
    start.current = null;
    if (!from) return;
    const dx = event.clientX - from.x;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(event.clientY - from.y)) {
      return dx < 0 ? player.next() : player.previous();
    }
    // A tap on a photo or button keeps its own meaning.
    if ((event.target as HTMLElement).closest('button, a, [data-draggable]')) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX - box.left > box.width * NEXT_ZONE) player.next();
    else player.previous();
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
          if (event.key === 'ArrowRight') player.next();
          if (event.key === 'ArrowLeft') player.previous();
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

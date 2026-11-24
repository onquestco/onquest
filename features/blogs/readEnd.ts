// blog_read_end (spec §3.8): the reader has the end marker on screen and the page has been visible
// for at least 5 seconds. Visible time, not scroll position, so it means the same on every phone.
// Pure, with the clock and timers passed in, so the rule is tested without a browser.

export const READ_END_MIN_MS = 5000;

type Clock = {
  now: () => number;
  /** Runs `run` after `ms`; returns a cancel. */
  schedule: (run: () => void, ms: number) => () => void;
};

export type ReadEndTracker = {
  /** The end marker came into view or left it. */
  markerInView: (inView: boolean) => void;
  /** document.visibilityState changed. */
  pageVisible: (visible: boolean) => void;
  /** Stops the timer (page left). */
  stop: () => void;
};

/** Calls `onReadEnd(seconds)` at most once. Starts counting from now, with the page visible or not. */
export function createReadEndTracker(
  clock: Clock,
  onReadEnd: (seconds: number) => void,
  startVisible: boolean,
): ReadEndTracker {
  let visibleMs = 0;
  let visibleSince: number | null = startVisible ? clock.now() : null;
  let inView = false;
  let fired = false;
  let cancel: (() => void) | null = null;

  const visibleTotal = () => visibleMs + (visibleSince === null ? 0 : clock.now() - visibleSince);

  function clearTimer() {
    cancel?.();
    cancel = null;
  }

  function check() {
    clearTimer();
    if (fired || !inView) return;
    const total = visibleTotal();
    if (total >= READ_END_MIN_MS) {
      fired = true;
      onReadEnd(Math.round(total / 1000));
      return;
    }
    // Only time that passes while the page is visible counts: no timer while it's hidden.
    if (visibleSince !== null) cancel = clock.schedule(check, READ_END_MIN_MS - total);
  }

  return {
    markerInView(next) {
      inView = next;
      check();
    },
    pageVisible(visible) {
      if (visible && visibleSince === null) visibleSince = clock.now();
      if (!visible && visibleSince !== null) {
        visibleMs += clock.now() - visibleSince;
        visibleSince = null;
      }
      check();
    },
    stop: clearTimer,
  };
}

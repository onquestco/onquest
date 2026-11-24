import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createReadEndTracker } from './readEnd';

// The rule behind useReadEnd (spec §3.8), with fake timers standing in for the browser's.

function setup(startVisible = true) {
  const onReadEnd = vi.fn<(seconds: number) => void>();
  const tracker = createReadEndTracker(
    {
      now: () => Date.now(),
      schedule: (run, ms) => {
        const timer = setTimeout(run, ms);
        return () => clearTimeout(timer);
      },
    },
    onReadEnd,
    startVisible,
  );
  return { tracker, onReadEnd };
}

describe('blog_read_end', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('a short blog whose end is on screen at once fires at 5 s, not on open', () => {
    const { tracker, onReadEnd } = setup();
    tracker.markerInView(true);
    vi.advanceTimersByTime(4999);
    expect(onReadEnd).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onReadEnd).toHaveBeenCalledWith(5);
  });

  it('a long blog fires when the end comes into view after 5 s, with the visible seconds', () => {
    const { tracker, onReadEnd } = setup();
    vi.advanceTimersByTime(42_400);
    expect(onReadEnd).not.toHaveBeenCalled();
    tracker.markerInView(true);
    expect(onReadEnd).toHaveBeenCalledWith(42);
  });

  it('fires once per page view, however often the end comes back into view', () => {
    const { tracker, onReadEnd } = setup();
    vi.advanceTimersByTime(10_000);
    tracker.markerInView(true);
    tracker.markerInView(false);
    tracker.markerInView(true);
    vi.advanceTimersByTime(60_000);
    expect(onReadEnd).toHaveBeenCalledTimes(1);
  });

  it('does not count time while the page is hidden', () => {
    const { tracker, onReadEnd } = setup();
    vi.advanceTimersByTime(2000);
    tracker.pageVisible(false);
    vi.advanceTimersByTime(60_000); // the app in the background
    tracker.markerInView(true);
    expect(onReadEnd).not.toHaveBeenCalled();
    tracker.pageVisible(true);
    vi.advanceTimersByTime(2999);
    expect(onReadEnd).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onReadEnd).toHaveBeenCalledWith(5);
  });

  it('leaving the end before 5 s cancels the pending fire', () => {
    const { tracker, onReadEnd } = setup();
    tracker.markerInView(true);
    vi.advanceTimersByTime(3000);
    tracker.markerInView(false);
    vi.advanceTimersByTime(10_000);
    expect(onReadEnd).not.toHaveBeenCalled();
  });

  it('a page opened in the background starts counting only once it is shown', () => {
    const { tracker, onReadEnd } = setup(false);
    tracker.markerInView(true);
    vi.advanceTimersByTime(30_000);
    expect(onReadEnd).not.toHaveBeenCalled();
    tracker.pageVisible(true);
    vi.advanceTimersByTime(5000);
    expect(onReadEnd).toHaveBeenCalledWith(5);
  });

  it('stop() cancels a pending fire', () => {
    const { tracker, onReadEnd } = setup();
    tracker.markerInView(true);
    tracker.stop();
    vi.advanceTimersByTime(10_000);
    expect(onReadEnd).not.toHaveBeenCalled();
  });
});

'use client';

import { useRef, useState } from 'react';
import type { Selection } from './formatCommands';

// Undo and redo for the blog body (spec §6.1, D5). A controlled textarea loses the browser's own
// undo stack as soon as code sets its value, so the composer keeps its own: in memory only, at
// most 100 steps, one per toolbar command and one per burst of typing.

export type Snapshot = { body: string; selection: Selection };
export type History = {
  past: Snapshot[];
  present: Snapshot;
  future: Snapshot[];
  /** When the last keystroke of the current burst of typing happened, or null between bursts. */
  typedAt: number | null;
};

export const MAX_STEPS = 100;
/** Typing after a pause this long (or longer) starts a new undo step. */
export const TYPING_PAUSE_MS = 1000;

const capped = (past: Snapshot[]) => (past.length > MAX_STEPS ? past.slice(past.length - MAX_STEPS) : past);

export function startHistory(present: Snapshot): History {
  return { past: [], present, future: [], typedAt: null };
}

/** Typing: merged into the step in progress unless the writer paused for a second or more. */
export function recordTyping(history: History, before: Snapshot, after: Snapshot, at: number): History {
  const merging = history.typedAt !== null && at - history.typedAt < TYPING_PAUSE_MS;
  return {
    past: merging ? history.past : capped([...history.past, before]),
    present: after,
    future: [],
    typedAt: at,
  };
}

/** A toolbar command or shortcut: always a step of its own. */
export function recordCommand(history: History, before: Snapshot, after: Snapshot): History {
  return { past: capped([...history.past, before]), present: after, future: [], typedAt: null };
}

export function undo(history: History): History {
  const previous = history.past.at(-1);
  if (!previous) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
    typedAt: null,
  };
}

export function redo(history: History): History {
  const [next, ...rest] = history.future;
  if (!next) return history;
  return { past: capped([...history.past, history.present]), present: next, future: rest, typedAt: null };
}

export type BodyHistory = ReturnType<typeof useBodyHistory>;

/**
 * The history as the body field uses it. Undo and redo return the snapshot to show, or null. Held by
 * the composer screen, above the edit/preview switch, so it survives opening Preview (review #48).
 */
export function useBodyHistory(initial: Snapshot) {
  const [history, setHistory] = useState(() => startHistory(initial));
  // Event handlers can run twice before a re-render (a keystroke straight after a command).
  const latest = useRef(history);
  const update = (next: History) => {
    latest.current = next;
    setHistory(next);
    return next;
  };
  const step = (move: (current: History) => History) => {
    const current = latest.current;
    const next = move(current);
    return next === current ? null : update(next).present;
  };
  return {
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    typed: (before: Snapshot, after: Snapshot) =>
      void update(recordTyping(latest.current, before, after, Date.now())),
    command: (before: Snapshot, after: Snapshot) => void update(recordCommand(latest.current, before, after)),
    undo: () => step(undo),
    redo: () => step(redo),
  };
}

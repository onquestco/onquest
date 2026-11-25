import { describe, expect, it } from 'vitest';
import {
  MAX_STEPS,
  recordCommand,
  recordTyping,
  redo,
  startHistory,
  TYPING_PAUSE_MS,
  undo,
  type History,
  type Snapshot,
} from './useBodyHistory';

// The body's own undo history (spec §6.1, D5), as the pure steps the hook runs.

const at = (body: string): Snapshot => ({ body, selection: { start: body.length, end: body.length } });

/** Types `text` one character a time, `gap` ms apart, starting at `from`. */
function type(history: History, text: string, from: number, gap = 100): History {
  let next = history;
  for (let i = 0; i < text.length; i++) {
    const before = next.present;
    next = recordTyping(next, before, at(before.body + text[i]), from + i * gap);
  }
  return next;
}

describe('body history', () => {
  it('a burst of typing is one step', () => {
    const typed = type(startHistory(at('')), 'Goa', 0);
    expect(typed.present.body).toBe('Goa');
    expect(undo(typed).present.body).toBe('');
  });

  it(`a pause of ${TYPING_PAUSE_MS} ms or more starts a new step`, () => {
    let history = type(startHistory(at('')), 'Goa', 0);
    history = type(history, ' trip', 200 + TYPING_PAUSE_MS);
    expect(history.present.body).toBe('Goa trip');
    expect(undo(history).present.body).toBe('Goa');
    expect(undo(undo(history)).present.body).toBe('');
  });

  it('a pause just under a second still merges', () => {
    let history = type(startHistory(at('')), 'Go', 0);
    history = recordTyping(history, history.present, at('Goa'), 100 + TYPING_PAUSE_MS - 1);
    expect(undo(history).present.body).toBe('');
  });

  it('every command is its own step, and typing after one starts a new step', () => {
    let history = type(startHistory(at('')), 'Pack light', 0);
    history = recordCommand(
      history,
      { body: 'Pack light', selection: { start: 5, end: 10 } },
      {
        body: 'Pack **light**',
        selection: { start: 7, end: 12 },
      },
    );
    history = type(history, '!', 1_100);
    expect(history.present.body).toBe('Pack **light**!');
    const once = undo(history);
    expect(once.present.body).toBe('Pack **light**');
    const twice = undo(once);
    // The selection comes back with the text, so the word is selected again.
    expect(twice.present).toEqual({ body: 'Pack light', selection: { start: 5, end: 10 } });
  });

  it('redo walks forward again, and a new change clears it', () => {
    let history = recordCommand(startHistory(at('a')), at('a'), at('**a**'));
    history = undo(history);
    expect(history.future).toHaveLength(1);
    expect(redo(history).present.body).toBe('**a**');
    expect(recordCommand(history, at('a'), at('*a*')).future).toEqual([]);
    expect(recordTyping(history, at('a'), at('ab'), 0).future).toEqual([]);
  });

  it('undo with nothing to undo, or redo with nothing to redo, changes nothing', () => {
    const history = startHistory(at('x'));
    expect(undo(history)).toBe(history);
    expect(redo(history)).toBe(history);
  });

  it(`keeps at most ${MAX_STEPS} steps, dropping the oldest`, () => {
    let history = startHistory(at(''));
    for (let i = 0; i < MAX_STEPS + 20; i++) history = recordCommand(history, history.present, at(`${i}`));
    expect(history.past).toHaveLength(MAX_STEPS);
    let back = history;
    while (back.past.length > 0) back = undo(back);
    expect(back.present.body).toBe('19');
    for (let i = 0; i < 5; i++) history = redo(undo(history));
    expect(history.past).toHaveLength(MAX_STEPS);
  });
});

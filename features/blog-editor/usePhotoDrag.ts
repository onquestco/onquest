'use client';

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';

// Reordering photos by dragging (PRD B3) without taking over the page's scrolling (BL-03 review
// S3). A finger has to rest on a photo for a moment before it picks it up; a swipe that starts
// on a photo still scrolls the page. A mouse picks it up straight away.

export const LONG_PRESS_MS = 300;
/** More movement than this before the long press ends is a swipe, not a press. */
export const MOVE_TOLERANCE_PX = 8;

type Drag = { from: number; over: number; pointerId: number };
type Press = { pointerId: number; x: number; y: number; timer: ReturnType<typeof setTimeout> };

function indexUnder(event: PointerEvent): number | null {
  const element = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-photo-index]');
  const index = element instanceof HTMLElement ? Number(element.dataset.photoIndex) : Number.NaN;
  return Number.isNaN(index) ? null : index;
}

export function usePhotoDrag(onMove: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragging = useRef<Drag | null>(null);
  const press = useRef<Press | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  function update(next: Drag | null) {
    dragging.current = next;
    setDrag(next);
  }

  function cancelPress() {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  }

  // Once a photo is picked up, the finger moves it instead of scrolling. Only a non-passive
  // listener can stop the scroll, and React's touch listeners are passive.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const holdPage = (event: TouchEvent) => {
      if (dragging.current && event.cancelable) event.preventDefault();
    };
    list.addEventListener('touchmove', holdPage, { passive: false });
    return () => list.removeEventListener('touchmove', holdPage);
  }, []);

  // A press still waiting when the composer closes is dropped with it.
  useEffect(() => {
    const waiting = press;
    return () => {
      if (waiting.current) clearTimeout(waiting.current.timer);
    };
  }, []);

  function pickUp(element: HTMLElement, pointerId: number, index: number) {
    try {
      element.setPointerCapture(pointerId);
    } catch {
      // The finger already lifted: nothing to drag.
      return;
    }
    update({ from: index, over: index, pointerId });
  }

  /** The same handlers for every photo: each reads its place from its data-photo-index. */
  const handlers = {
    onPointerDown(event: PointerEvent<HTMLLIElement>) {
      // The × and move buttons are taps, not drags.
      if ((event.target as HTMLElement).closest('button')) return;
      const index = Number(event.currentTarget.dataset.photoIndex);
      if (Number.isNaN(index)) return;
      if (event.pointerType === 'mouse') {
        if (event.button === 0) pickUp(event.currentTarget, event.pointerId, index);
        return;
      }
      cancelPress();
      const element = event.currentTarget;
      const { pointerId, clientX, clientY } = event;
      press.current = {
        pointerId,
        x: clientX,
        y: clientY,
        timer: setTimeout(() => {
          press.current = null;
          pickUp(element, pointerId, index);
        }, LONG_PRESS_MS),
      };
    },
    onPointerMove(event: PointerEvent<HTMLLIElement>) {
      const waiting = press.current;
      if (
        waiting?.pointerId === event.pointerId &&
        Math.hypot(event.clientX - waiting.x, event.clientY - waiting.y) > MOVE_TOLERANCE_PX
      ) {
        cancelPress(); // a swipe: let the page scroll
      }
      const current = dragging.current;
      if (!current || current.pointerId !== event.pointerId) return;
      const over = indexUnder(event);
      if (over !== null && over !== current.over) update({ ...current, over });
    },
    onPointerUp(event: PointerEvent<HTMLLIElement>) {
      cancelPress();
      const current = dragging.current;
      if (!current || current.pointerId !== event.pointerId) return;
      if (current.over !== current.from) onMove(current.from, current.over);
      update(null);
    },
    onPointerCancel() {
      cancelPress();
      update(null);
    },
    // A long press would otherwise open the phone's image menu.
    onContextMenu(event: MouseEvent<HTMLLIElement>) {
      event.preventDefault();
    },
  };

  return { drag, listRef, handlers };
}

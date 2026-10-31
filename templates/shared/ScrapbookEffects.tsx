'use client';

import { useEffect } from 'react';
import styles from './scrapbook.module.css';

const HOLD_TO_DRAG_MS = 220; // on touch, a short hold starts a drag so normal swipes still scroll
const DRAG_THRESHOLD_PX = 5;

/**
 * Page-wide behaviour for scrapbook pages, attached once:
 * - cards below the fold drop their photos in when scrolled into view
 * - photos and stickers ([data-draggable]) can be dragged around (viewer-only, not saved)
 */
export function ScrapbookEffects() {
  useEffect(() => dropInBelowTheFold(), []);
  useEffect(() => enableDragging(), []);
  return null;
}

function dropInBelowTheFold() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const stages = Array.from(document.querySelectorAll<HTMLElement>('[data-stage]'));
  // Only animate cards that start off-screen, so the first screen (and LCP) is never hidden.
  const below = stages.filter((stage) => stage.getBoundingClientRect().top > window.innerHeight);
  below.forEach((stage) => stage.setAttribute('data-pending', ''));

  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const stage = entry.target as HTMLElement;
        stage.removeAttribute('data-pending');
        stage.setAttribute('data-dropping', '');
        observer.unobserve(stage);
      }),
    { threshold: 0.25 },
  );
  below.forEach((stage) => observer.observe(stage));

  return () => observer.disconnect();
}

function enableDragging() {
  let topZ = 40;
  let active: {
    element: HTMLElement;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    armed: boolean;
    moved: boolean;
    timer?: number;
  } | null = null;

  const currentOffset = (element: HTMLElement) => {
    const [x = '0', y = '0'] = (element.style.translate || '0px 0px').split(' ');
    return [parseFloat(x) || 0, parseFloat(y) || 0] as const;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button > 0) return;
    const element = (event.target as Element).closest<HTMLElement>('[data-draggable]');
    if (!element) return;
    const [originX, originY] = currentOffset(element);
    const isTouchPhoto = event.pointerType === 'touch' && !element.classList.contains(styles.sticker!);
    active = {
      element,
      startX: event.clientX,
      startY: event.clientY,
      originX,
      originY,
      armed: !isTouchPhoto,
      moved: false,
    };
    if (isTouchPhoto) {
      const drag = active;
      drag.timer = window.setTimeout(() => {
        drag.armed = true;
        element.classList.add(styles.lifted!);
        navigator.vibrate?.(8);
      }, HOLD_TO_DRAG_MS);
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!active?.armed) return;
    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    if (!active.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    if (!active.moved) {
      active.moved = true;
      active.element.classList.add(styles.lifted!);
      active.element.style.zIndex = String(++topZ);
    }
    active.element.style.translate = `${active.originX + dx}px ${active.originY + dy}px`;
  };

  const onPointerUp = () => {
    if (!active) return;
    window.clearTimeout(active.timer);
    active.element.classList.remove(styles.lifted!);
    if (active.moved) active.element.dataset.justDragged = 'true';
    active = null;
  };

  // While a drag is armed on touch, stop the page from scrolling.
  const onTouchMove = (event: TouchEvent) => {
    if (active?.armed) event.preventDefault();
  };

  // A drag ends with a click; swallow it so the memory sheet doesn't open.
  const onClickCapture = (event: MouseEvent) => {
    const element = (event.target as Element).closest<HTMLElement>('[data-draggable]');
    if (element?.dataset.justDragged) {
      delete element.dataset.justDragged;
      event.stopPropagation();
      event.preventDefault();
    }
  };

  document.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('click', onClickCapture, true);

  return () => {
    document.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('click', onClickCapture, true);
  };
}

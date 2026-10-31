'use client';

import { useState } from 'react';
import styles from './scrapbook.module.css';

type PlacedSticker = { id: string; emoji: string; left: number; top: number; rotate: number };

/**
 * Floating "Stickers" button. Viewers can drop emoji stickers anywhere on the page for fun.
 * Nothing is saved; double-tap a sticker to remove it.
 */
export function StickerTray({ emoji }: { emoji: string[] }) {
  const [open, setOpen] = useState(false);
  const [placed, setPlaced] = useState<PlacedSticker[]>([]);

  const add = (sticker: string) => {
    setPlaced((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        emoji: sticker,
        left: window.innerWidth * (0.2 + Math.random() * 0.5),
        top: window.scrollY + window.innerHeight * (0.3 + Math.random() * 0.3),
        rotate: Math.round(Math.random() * 30 - 15),
      },
    ]);
  };

  const remove = (id: string) => setPlaced((current) => current.filter((s) => s.id !== id));

  return (
    <>
      {placed.map((sticker) => (
        <span
          key={sticker.id}
          className={styles.sticker}
          style={{ left: sticker.left, top: sticker.top, rotate: `${sticker.rotate}deg`, zIndex: 50 }}
          aria-hidden
          data-draggable
          onDoubleClick={() => remove(sticker.id)}
        >
          {sticker.emoji}
        </span>
      ))}

      <div className={styles.tray}>
        {open && (
          <div className={styles.trayBox}>
            {emoji.map((sticker) => (
              <button
                type="button"
                key={sticker}
                aria-label={`Add sticker ${sticker}`}
                onClick={() => add(sticker)}
              >
                {sticker}
              </button>
            ))}
            <p className={styles.trayTip}>Drag to place. Double-tap to remove.</p>
            <button type="button" className={styles.trayClear} onClick={() => setPlaced([])}>
              Clear mine
            </button>
          </div>
        )}
        <button
          type="button"
          className={styles.trayButton}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          Stickers
        </button>
      </div>
    </>
  );
}

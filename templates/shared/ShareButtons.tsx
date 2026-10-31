'use client';

import { useRef, useState } from 'react';
import styles from './scrapbook.module.css';

/** "Copy story link" + "Share" (native share sheet, falls back to copying). */
export function ShareButtons({ title, text }: { title: string; text: string }) {
  const [message, setMessage] = useState('');
  const timer = useRef<number | undefined>(undefined);

  const flash = (value: string) => {
    setMessage(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(''), 3000);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      flash('Link copied');
    } catch {
      flash('Copy the link from your address bar');
    }
  };

  const share = async () => {
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({ title, text, url: window.location.href });
    } catch {
      // The user closed the share sheet; nothing to do.
    }
  };

  return (
    <>
      <div className={styles.buttons}>
        <button type="button" className={styles.button} onClick={copyLink}>
          Copy story link
        </button>
        <button type="button" className={`${styles.button} ${styles.buttonGhost}`} onClick={share}>
          Share
        </button>
      </div>
      <p className={styles.toast} role="status">
        {message}
      </p>
    </>
  );
}

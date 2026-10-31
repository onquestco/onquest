import type { CSSProperties } from 'react';
import type { Photo as PhotoData } from '@/lib/trip/types';
import styles from './scrapbook.module.css';

export type Frame = 'polaroid' | 'torn' | 'circle' | 'plain';

type Props = {
  photo: PhotoData;
  frame: Frame;
  /** Position and width in % of the Stage. */
  x: number;
  y: number;
  width: number;
  /** Width / height of the visible image. Defaults to the photo's own shape. */
  aspect?: number;
  rotate?: number;
  z?: number;
  /** Delay (s) for the drop-in animation. */
  delay?: number;
  /** Handwritten label under a polaroid. */
  label?: string;
  /** Tape colour on top of a polaroid. */
  tape?: string;
  /** Memory sheet to open on tap (see sheets.ts). Without it the photo isn't a button. */
  opens?: string;
  /** Load first (use for the photo most likely to be the largest on the first screen). */
  priority?: boolean;
};

/** One scrapbook photo: polaroid, torn paper, circle or plain frame. Draggable on the page. */
export function Photo({
  photo,
  frame,
  x,
  y,
  width,
  aspect,
  rotate = 0,
  z = 6,
  delay = 0,
  label,
  tape,
  opens,
  priority,
}: Props) {
  const style = {
    left: `${x}%`,
    top: `${y}%`,
    width: `${width}%`,
    zIndex: z,
    '--rotate': `${rotate}deg`,
    '--aspect': aspect ?? photo.width / photo.height,
    '--delay': `${delay}s`,
    ...(tape ? { '--tape': tape } : {}),
  } as CSSProperties;

  const alt = photo.caption ?? label ?? '';
  const sameSize = photo.thumb === photo.display;

  const content = (
    <span className={styles.shape}>
      <img
        src={photo.display}
        srcSet={sameSize ? undefined : `${photo.thumb} 400w, ${photo.display} 1600w`}
        sizes={sameSize ? undefined : `${Math.ceil(width * 5.4)}px`}
        width={photo.width}
        height={photo.height}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        draggable={false}
      />
      {label && <i className={styles.label}>{label}</i>}
    </span>
  );

  const className = `${styles.scrap} ${styles[frame]}`;

  if (!opens) {
    return (
      <div className={className} style={style} data-draggable>
        {content}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={className}
      style={style}
      data-draggable
      data-opens={opens}
      aria-label={alt || 'Open photo'}
    >
      {content}
    </button>
  );
}

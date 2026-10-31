import type { CSSProperties, ElementType, ReactNode } from 'react';
import styles from './scrapbook.module.css';

type Position = {
  /** Position and (optional) width in % of the Stage. */
  x: number;
  y: number;
  width?: number;
  z?: number;
  style?: CSSProperties;
};

type TextProps = Position & {
  children: ReactNode;
  role?: 'script' | 'type' | 'hand' | 'serif';
  /** Render as a heading or paragraph for structure; looks the same. */
  as?: ElementType;
};

const place = ({ x, y, width, z, style }: Position): CSSProperties => ({
  left: `${x}%`,
  top: `${y}%`,
  width: width === undefined ? undefined : `${width}%`,
  zIndex: z,
  ...style,
});

/** Positioned text on a Stage. */
export function Text({ children, role, as: Tag = 'div', ...position }: TextProps) {
  const className = [styles.text, role && styles[role]].filter(Boolean).join(' ');
  return (
    <Tag className={className} style={place(position)}>
      {children}
    </Tag>
  );
}

/** White paper strip with typewriter text, e.g. "My Goa Trip". */
export function Strip({
  children,
  fontSize,
  ...position
}: Position & { children: ReactNode; fontSize?: string }) {
  return (
    <div className={styles.text} style={place({ ...position, z: position.z ?? 8 })}>
      <span className={styles.strip} style={{ fontSize }}>
        {children}
      </span>
    </div>
  );
}

/** Dashed postage stamp: a big line on top, a small line below. */
export function Stamp({ big, small, ...position }: Position & { big: ReactNode; small?: ReactNode }) {
  return (
    <div className={`${styles.text} ${styles.stamp}`} style={place({ ...position, z: position.z ?? 9 })}>
      <b>{big}</b>
      {small}
    </div>
  );
}

/** Pill button at the bottom of a card that opens a memory sheet. */
export function OpenButton({ opens, children }: { opens: string; children: ReactNode }) {
  return (
    <button type="button" className={`${styles.text} ${styles.openButton}`} data-opens={opens}>
      {children}
    </button>
  );
}

/** A decorative emoji sticker viewers can drag around. */
export function Sticker({
  emoji,
  x,
  y,
  rotate = 0,
}: {
  emoji: string;
  x: number;
  y: number;
  rotate?: number;
}) {
  return (
    <span
      className={styles.sticker}
      style={{ left: `${x}%`, top: `${y}%`, rotate: `${rotate}deg` }}
      aria-hidden
      data-draggable
    >
      {emoji}
    </span>
  );
}

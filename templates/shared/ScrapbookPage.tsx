import type { CSSProperties, ReactNode } from 'react';
import type { TripData } from '@/lib/trip/types';
import type { Theme } from '../types';
import { Footer } from './Footer';
import { MemorySheet } from './MemorySheet';
import { ScrapbookEffects } from './ScrapbookEffects';
import { buildSheets } from './sheets';
import { StickerTray } from './StickerTray';
import styles from './scrapbook.module.css';

const themeVariables = ({ colors }: Theme) =>
  ({
    '--paper': colors.paper,
    '--ink': colors.ink,
    '--accent': colors.accent,
    '--accent2': colors.accent2,
    '--sand': colors.sand,
    '--cream': colors.cream,
    '--sky': colors.sky,
  }) as CSSProperties;

/**
 * The frame every template's trip page renders inside: theme colours + fonts,
 * the memory sheet, sticker tray, drag/drop-in effects and the footer.
 */
export function ScrapbookPage({
  trip,
  theme,
  children,
}: {
  trip: TripData;
  theme: Theme;
  children: ReactNode;
}) {
  return (
    <div className={`${theme.fontClassName} ${styles.page}`} style={themeVariables(theme)}>
      <article>{children}</article>
      <Footer trip={trip} />
      <MemorySheet sheets={buildSheets(trip)} />
      <StickerTray emoji={theme.stickers} />
      <ScrapbookEffects />
    </div>
  );
}

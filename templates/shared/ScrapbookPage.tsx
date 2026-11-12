import type { CSSProperties, ReactNode } from 'react';
import type { TripData } from '@/lib/trip/types';
import type { Theme } from '../types';
import { MemorySheet } from './MemorySheet';
import { ScrapbookEffects } from './ScrapbookEffects';
import { buildSheets } from './sheets';
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
 * the memory sheet and drag/drop-in effects (no sticker tray: not in the prototype, founder 11 Nov). The app adds the byline, Make your own
 * and the site footer (with Report) under it, so the template has no footer of its own.
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
      <MemorySheet sheets={buildSheets(trip)} />
      <ScrapbookEffects />
    </div>
  );
}

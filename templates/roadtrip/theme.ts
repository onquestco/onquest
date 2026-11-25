import type { Theme } from '../types';
import { roadtripFontClassName } from './fonts';

// Blue skies, orange signs and the open road, from docs/reference/templates/roadtrip.html (:root
// and its scenes).
export const theme: Theme = {
  colors: {
    paper: '#BFE3F8',
    ink: '#4A2A12',
    accent: '#F28C1B',
    accent2: '#E5532D',
    sand: '#E9D7A5',
    cream: '#FFF3C4',
    sky: '#79BDF0',
  },
  // The photo pages' base colours, in the order they cycle: sunset, hills, night.
  dayBackgrounds: ['#F27A54', '#D3ECFB', '#0E1B3D'],
  stickers: ['🚗', '🛣️', '☀️', '🦋', '✈️'],
  fontClassName: roadtripFontClassName,
};

/** Washi tape colours, used in rotation. */
export const tapes = ['rgba(255,210,94,.9)', 'rgba(142,208,240,.8)', 'rgba(229,83,45,.6)'];

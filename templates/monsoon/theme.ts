import type { Theme } from '../types';
import { monsoonFontClassName } from './fonts';

// Storm blues, wet greens and an orange umbrella, from docs/reference/templates/monsoon.md (:root and
// its scenes). The design has no sand, cream or sky colour of its own: sand is its misty grey-blue,
// cream the pale bottom of its bright sky, sky the top of it.
export const theme: Theme = {
  colors: {
    paper: '#0F3A63',
    ink: '#0F3A63',
    accent: '#2468AB',
    accent2: '#F29B1E',
    sand: '#D5E6EA',
    cream: '#EAF6FC',
    sky: '#BFE6F8',
  },
  // The photo pages' base colours, in the order they cycle: lush green rain, bright sky, misty umbrellas.
  dayBackgrounds: ['#215E49', '#BFE6F8', '#D5E6EA'],
  stickers: ['💧', '☁️', '☂️', '⚡', '🍃'],
  fontClassName: monsoonFontClassName,
};

/** Washi tape colours, used in rotation. */
export const tapes = ['rgba(108,196,242,.75)', 'rgba(242,155,30,.65)', 'rgba(255,255,255,.8)'];

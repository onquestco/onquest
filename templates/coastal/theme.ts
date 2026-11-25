import type { Theme } from '../types';
import { coastalFontClassName } from './fonts';

// Sea, sand and sunshine, from docs/reference/templates/coastal.html (:root and the sample trip).
export const theme: Theme = {
  colors: {
    paper: '#FFF8E1',
    ink: '#103A4A',
    accent: '#1FA3B8',
    accent2: '#E8323C',
    sand: '#F6DDB0',
    cream: '#FFFDF3',
    sky: '#8EE3EF',
  },
  dayBackgrounds: ['#FFF8E1', '#D9F5F8', '#FFE8D6', '#CFEFF4', '#FFF1C9'],
  stickers: ['🌴', '🐚', '⭐', '🍉', '☀️'],
  fontClassName: coastalFontClassName,
};

/** Washi tape colours, used in rotation. */
export const tapes = ['rgba(142,227,239,.85)', 'rgba(244,115,154,.55)', 'rgba(255,212,94,.8)'];

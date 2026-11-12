import type { Theme } from '../types';
import { mountainFontClassName } from './fonts';

// Pine, slate and kraft paper, from the prototype's Mountain preview.
export const theme: Theme = {
  colors: {
    paper: '#E6EBE3',
    ink: '#2C3A31',
    accent: '#5F7F63',
    accent2: '#B4532A',
    sand: '#D9C6A3',
    cream: '#FBFAF6',
    sky: '#B7C9D6',
  },
  dayBackgrounds: ['#E6EBE3', '#DCE4DF', '#EAE4D6', '#D8E2E8', '#E3E8DA'],
  stickers: ['🏔️', '🌲', '🧭', '⛺', '☕', '🥾', '❄️', '🦅'],
  fontClassName: mountainFontClassName,
};

/** Kraft and washi tape colours, used in rotation. */
export const tapes = ['rgba(217,198,163,.9)', 'rgba(95,127,99,.55)', 'rgba(180,83,42,.5)'];

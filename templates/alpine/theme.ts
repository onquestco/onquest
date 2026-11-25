import type { Theme } from '../types';
import { alpineFontClassName } from './fonts';

// Pines, peaks and alpine light, from docs/reference/templates/mountain.html (:root and the sample trip).
export const theme: Theme = {
  colors: {
    paper: '#F8F5EA',
    ink: '#25382E',
    accent: '#5F7F63',
    accent2: '#B4532A',
    sand: '#D9C6A3',
    cream: '#FBFAF6',
    sky: '#9DB8CE',
  },
  // The photo pages' base colours, in the order they cycle: forest, sunrise, night.
  dayBackgrounds: ['#F3F4E6', '#FFD7B0', '#16213E'],
  stickers: ['🌲', '🏔️', '🧭', '⛺', '☁️'],
  fontClassName: alpineFontClassName,
};

/** Washi tape colours, used in rotation. */
export const tapes = ['rgba(217,198,163,.92)', 'rgba(111,143,176,.6)', 'rgba(95,127,99,.6)'];

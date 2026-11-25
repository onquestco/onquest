import type { Theme } from '../types';
import { winterFontClassName } from './fonts';

// Snow-blue skies, deep night and a red beanie, from docs/reference/templates/winter.md (:root and
// its scenes). The design has no sand, cream or sky colour of its own: sand is its pale drift blue,
// cream the cabin roof's snow, sky the top of its snow sky.
export const theme: Theme = {
  colors: {
    paper: '#6DB9DE',
    ink: '#17426B',
    accent: '#3B8FC4',
    accent2: '#D8433A',
    sand: '#CFE9F6',
    cream: '#F4F8FB',
    sky: '#7CC4E6',
  },
  // The photo pages' base colours, in the order they cycle: snowy forest at dusk, cabin night, aurora.
  dayBackgrounds: ['#8FA7E3', '#0F1F46', '#071A33'],
  stickers: ['❄️', '🧣', '🌲', '⛄', '⭐'],
  fontClassName: winterFontClassName,
};

/** Washi tape colours, used in rotation. */
export const tapes = ['rgba(255,255,255,.75)', 'rgba(216,67,58,.55)', 'rgba(120,190,230,.7)'];

import type { Theme } from '../types';
import { beachFontClassName } from './fonts';

export const theme: Theme = {
  colors: {
    paper: '#F1E9D8',
    ink: '#123B47',
    accent: '#177E89',
    accent2: '#F28C70',
    sand: '#E8D9BD',
    cream: '#FFF6D8',
    sky: '#A3BCC9',
  },
  dayBackgrounds: ['#A3BCC9', '#EBD9B4', '#FFF3D1', '#BFE3F2', '#FFD9C2'],
  stickers: ['🐚', '🌴', '☀️', '🦀', '🍹', '⭐', '🐠', '🥥'],
  fontClassName: beachFontClassName,
};

/** Tape colours for polaroids, used in rotation. */
export const tapes = ['rgba(23,126,137,.5)', 'rgba(242,140,112,.65)', 'rgba(240,212,120,.75)'];

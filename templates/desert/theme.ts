import type { Theme } from '../types';
import { desertFontClassName } from './fonts';

// Sand, terracotta and a deep indigo night, from docs/reference/templates/desert.md (:root and its
// scenes). The design has no sand, cream or sky colour of its own: sand is its first dune, cream the
// stamp's pale parchment, sky the top of its sun sky.
export const theme: Theme = {
  colors: {
    paper: '#EAD7AC',
    ink: '#6B3F26',
    accent: '#A5663F',
    accent2: '#B4532A',
    sand: '#D3A57C',
    cream: '#FAF0D6',
    sky: '#FBE6A8',
  },
  // The photo pages' base colours, in the order they cycle: sun, dusk, night (tops of dSun, dDusk, dNight).
  dayBackgrounds: ['#FBE6A8', '#F3D5BC', '#171F4F'],
  stickers: ['🌙', '✨', '🌴', '🌵', '☀️'],
  fontClassName: desertFontClassName,
};

/** Washi tape colours, used in rotation. */
export const tapes = ['rgba(217,170,120,.85)', 'rgba(180,83,42,.5)', 'rgba(250,240,214,.85)'];

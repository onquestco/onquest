import type { ReactNode } from 'react';
import type { TripData } from '@/lib/trip/types';

/** Colours every template provides. Exposed to CSS as --paper, --ink, --accent, … */
export type ThemeColors = {
  paper: string; // page background
  ink: string; // main text
  accent: string; // headings, hints, links
  accent2: string; // highlights, tape, stamps
  sand: string;
  cream: string;
  sky: string;
};

export type Theme = {
  colors: ThemeColors;
  /** Background per day card, cycled: dayBackgrounds[i % length]. */
  dayBackgrounds: string[];
  /** Emoji offered in the viewer sticker tray. */
  stickers: string[];
  /**
   * next/font class names. Each template loads 5 fonts exposed as
   * --font-script, --font-type, --font-hand, --font-serif, --font-sans.
   */
  fontClassName: string;
};

export type Template = {
  id: string;
  name: string;
  status: 'live' | 'coming-soon';
  /** Used by toTripData() when the traveler leaves these empty. */
  defaults: { title: string; closingHeadline: string };
  theme: Theme;
  /** The full interactive trip page. Pure: TripData in, markup out. */
  TripPage: (props: { trip: TripData }) => ReactNode;
  // Instagram StoryFrames / CarouselFrames are added in week 3 (see docs/02-lld.md §7).
};

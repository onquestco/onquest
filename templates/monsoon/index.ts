import type { Template } from '../types';
import { CarouselFrames, StoryFrame } from './exportFrames';
import { theme } from './theme';
import { TripPage } from './TripPage';

const monsoon = {
  id: 'monsoon',
  name: 'Monsoon',
  status: 'live',
  defaults: { title: 'Monsoon Diaries', closingHeadline: 'Until the next downpour.' },
  theme,
  TripPage,
  StoryFrame,
  CarouselFrames,
} satisfies Template;

export default monsoon;

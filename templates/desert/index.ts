import type { Template } from '../types';
import { CarouselFrames, StoryFrame } from './exportFrames';
import { theme } from './theme';
import { TripPage } from './TripPage';

const desert = {
  id: 'desert',
  name: 'Desert',
  status: 'live',
  defaults: { title: 'Into the Dunes', closingHeadline: 'Footprints in the sand.' },
  theme,
  TripPage,
  StoryFrame,
  CarouselFrames,
} satisfies Template;

export default desert;

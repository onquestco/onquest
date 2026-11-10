import type { Template } from '../types';
import { CarouselFrames, StoryFrame } from './exportFrames';
import { theme } from './theme';
import { TripPage } from './TripPage';

const mountain = {
  id: 'mountain',
  name: 'Mountain',
  status: 'live',
  defaults: { title: 'Above the Clouds', closingHeadline: 'The mountains are calling.' },
  theme,
  TripPage,
  StoryFrame,
  CarouselFrames,
} satisfies Template;

export default mountain;

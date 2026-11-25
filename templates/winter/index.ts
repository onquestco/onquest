import type { Template } from '../types';
import { CarouselFrames, StoryFrame } from './exportFrames';
import { theme } from './theme';
import { TripPage } from './TripPage';

const winter = {
  id: 'winter',
  name: 'Winter',
  status: 'live',
  defaults: { title: 'Let it Snow', closingHeadline: 'Until the next snowfall.' },
  theme,
  TripPage,
  StoryFrame,
  CarouselFrames,
} satisfies Template;

export default winter;

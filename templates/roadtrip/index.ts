import type { Template } from '../types';
import { CarouselFrames, StoryFrame } from './exportFrames';
import { theme } from './theme';
import { TripPage } from './TripPage';

const roadtrip = {
  id: 'roadtrip',
  name: 'Roadtrip',
  status: 'live',
  defaults: { title: 'Road Trip Summer Escape', closingHeadline: 'The road goes on.' },
  theme,
  TripPage,
  StoryFrame,
  CarouselFrames,
} satisfies Template;

export default roadtrip;

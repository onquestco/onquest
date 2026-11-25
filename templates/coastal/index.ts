import type { Template } from '../types';
import { CarouselFrames, StoryFrame } from './exportFrames';
import { theme } from './theme';
import { TripPage } from './TripPage';

const coastal = {
  id: 'coastal',
  name: 'Coastal',
  status: 'live',
  defaults: { title: 'Sun, Sea & Sand', closingHeadline: 'Nowhere else to be.' },
  theme,
  TripPage,
  StoryFrame,
  CarouselFrames,
} satisfies Template;

export default coastal;

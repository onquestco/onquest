import type { Template } from '../types';
import { CarouselFrames, StoryFrame } from './exportFrames';
import { theme } from './theme';
import { TripPage } from './TripPage';

// The new Mountain look. Its id is 'alpine' because 'mountain' is stored in existing Quests and
// keeps meaning the old, retired look forever (templates spec §4.2).
const alpine = {
  id: 'alpine',
  name: 'Mountain',
  status: 'live',
  defaults: { title: 'Above the Clouds', closingHeadline: 'The mountains are calling.' },
  theme,
  TripPage,
  StoryFrame,
  CarouselFrames,
} satisfies Template;

export default alpine;

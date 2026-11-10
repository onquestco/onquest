import type { Template } from '../types';
import { theme } from './theme';
import { TripPage } from './TripPage';

const mountain = {
  id: 'mountain',
  name: 'Mountain',
  status: 'live',
  defaults: { title: 'Above the Clouds', closingHeadline: 'The mountains are calling.' },
  theme,
  TripPage,
} satisfies Template;

export default mountain;

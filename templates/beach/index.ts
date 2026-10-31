import type { Template } from '../types';
import { theme } from './theme';
import { TripPage } from './TripPage';

const beach = {
  id: 'beach',
  name: 'Beach',
  status: 'live',
  defaults: { title: 'Salt in the Air, Sand in My Hair', closingHeadline: 'Nowhere else to be.' },
  theme,
  TripPage,
} satisfies Template;

export default beach;

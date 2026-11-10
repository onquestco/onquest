import type { TripData } from '@/lib/trip/types';
import { carouselFrames, StoryFrame as SharedStoryFrame, type FrameLook } from '../shared/ExportFrames';
import { tapes, theme } from './theme';

const look: FrameLook = { theme, tapes, titleFont: 'serif' };

export function StoryFrame({ trip }: { trip: TripData }) {
  return <SharedStoryFrame trip={trip} look={look} />;
}

export function CarouselFrames({ trip }: { trip: TripData }) {
  return carouselFrames(trip, look);
}

import type { TripData } from '@/lib/trip/types';
import { carouselFrames, StoryFrame as SharedStoryFrame, type FrameLook } from '../shared/ExportFrames';
import { CoverPage } from './CoverPage';
import { PhotoPage } from './PhotoPage';
import { theme } from './theme';

const look: FrameLook = { theme, Cover: CoverPage, Page: PhotoPage };

export function StoryFrame({ trip }: { trip: TripData }) {
  return <SharedStoryFrame trip={trip} look={look} />;
}

export function CarouselFrames({ trip }: { trip: TripData }) {
  return carouselFrames(trip, look);
}

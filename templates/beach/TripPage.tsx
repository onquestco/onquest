import type { ReactNode } from 'react';
import type { TripData } from '@/lib/trip/types';
import { MapSection } from '../shared/MapSection';
import { toQuestPages } from '../shared/pages';
import { QuestPlayer } from '../shared/QuestPlayer';
import { ScrapbookPage } from '../shared/ScrapbookPage';
import { CoverCard } from './OpeningSpread';
import { PhotoPage } from './PhotoPage';
import { theme } from './theme';

/** Beach as a paged Quest: cover, photo pages, route, then back to the cover. */
export function TripPage({ trip, controls }: { trip: TripData; controls?: ReactNode }) {
  const pages = toQuestPages(trip).map((page, index) => {
    if (page.kind === 'cover') return { key: 'cover', label: trip.shortTitle, content: <CoverCard trip={trip} /> };
    if (page.kind === 'route') return { key: 'route', label: 'Where I went', content: <MapSection trip={trip} /> };
    return {
      key: `page-${page.dayIndex}-${page.part}`,
      label: page.title,
      content: <PhotoPage trip={trip} page={page} pageNumber={index} />,
    };
  });

  return (
    <ScrapbookPage trip={trip} theme={theme}>
      <QuestPlayer pages={pages}>{controls}</QuestPlayer>
    </ScrapbookPage>
  );
}

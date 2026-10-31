import type { TripData } from '@/lib/trip/types';
import { DayRail } from '../shared/DayRail';
import { MapSection } from '../shared/MapSection';
import { ScrapbookPage } from '../shared/ScrapbookPage';
import { ClosingSpread } from './ClosingSpread';
import { DayCard } from './DayCard';
import { OpeningSpread } from './OpeningSpread';
import { theme } from './theme';

export function TripPage({ trip }: { trip: TripData }) {
  return (
    <ScrapbookPage trip={trip} theme={theme}>
      <OpeningSpread trip={trip} />
      <MapSection trip={trip} />
      {trip.days.length > 0 && (
        <DayRail>
          {trip.days.map((day, index) => (
            <DayCard key={day.number} trip={trip} day={day} index={index} />
          ))}
        </DayRail>
      )}
      <ClosingSpread trip={trip} />
    </ScrapbookPage>
  );
}

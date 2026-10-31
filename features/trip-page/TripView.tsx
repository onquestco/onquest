import type { TripData } from '@/lib/trip/types';
import { getTemplate } from '@/templates/registry';
import { serializeJsonLd, tripJsonLd } from './jsonLd';

/** Renders a trip with its template, plus structured data for search engines. */
export function TripView({ trip }: { trip: TripData }) {
  const { TripPage } = getTemplate(trip.templateId);

  return (
    <>
      <TripPage trip={trip} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(tripJsonLd(trip)) }}
      />
    </>
  );
}

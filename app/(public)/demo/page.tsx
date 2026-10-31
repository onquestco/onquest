import type { Metadata } from 'next';
import { tripMetadata } from '@/features/trip-page/metadata';
import { TripView } from '@/features/trip-page/TripView';
import { goaTrip } from '@/lib/demo/goaTrip';

export const metadata: Metadata = tripMetadata(goaTrip);

export default function DemoPage() {
  return <TripView trip={goaTrip} />;
}

import type { Metadata } from 'next';
import { tripMetadata } from '@/features/trip-page/metadata';
import { TripView } from '@/features/trip-page/TripView';
import { goaTrip } from '@/lib/demo/goaTrip';
import { sampleQuests, type SampleQuestName } from '@/lib/demo/sampleQuests';

export const metadata: Metadata = tripMetadata(goaTrip);

type Props = { searchParams: Promise<{ quest?: string }> };

// /demo plays the Goa sample; /demo?quest=small|full|old shows the edge-case samples.
export default async function DemoPage({ searchParams }: Props) {
  const { quest } = await searchParams;
  const trip = quest && quest in sampleQuests ? sampleQuests[quest as SampleQuestName] : goaTrip;
  return <TripView trip={trip} />;
}

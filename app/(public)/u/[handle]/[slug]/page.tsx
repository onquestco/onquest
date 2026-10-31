import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTrip } from '@/features/trip-page/getTrip';
import { tripMetadata } from '@/features/trip-page/metadata';
import { TripView } from '@/features/trip-page/TripView';

type Props = { params: Promise<{ handle: string; slug: string }> };

// Nothing is built ahead of time, but each page's HTML is cached after its first visit.
export const generateStaticParams = () => [];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, slug } = await params;
  const result = await getTrip(handle, slug);
  return result ? tripMetadata(result.trip, { unlisted: result.unlisted }) : {};
}

export default async function TripPage({ params }: Props) {
  const { handle, slug } = await params;
  const result = await getTrip(handle, slug);
  if (!result) notFound();

  return <TripView trip={result.trip} />;
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getQuestSocial } from '@/features/trip-page/getQuestSocial';
import { getQuestStatus } from '@/features/trip-page/getQuestStatus';
import { getTrip } from '@/features/trip-page/getTrip';
import { tripMetadata, unavailableMetadata } from '@/features/trip-page/metadata';
import { QuestUnavailable } from '@/features/trip-page/QuestUnavailable';
import { TripView } from '@/features/trip-page/TripView';

type Props = { params: Promise<{ handle: string; slug: string }> };

// Nothing is built ahead of time, but each page's HTML is cached after its first visit.
export const generateStaticParams = () => [];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, slug } = await params;
  const result = await getTrip(handle, slug);
  if (result) return tripMetadata(result.trip, { unlisted: result.unlisted });
  const status = await getQuestStatus(handle, slug);
  return status ? unavailableMetadata(status) : {};
}

export default async function TripPage({ params }: Props) {
  const { handle, slug } = await params;
  const result = await getTrip(handle, slug);
  if (!result) {
    const status = await getQuestStatus(handle, slug);
    if (!status) notFound();
    return (
      <QuestUnavailable reason={status} url={{ handle: handle.toLowerCase(), slug: slug.toLowerCase() }} />
    );
  }

  // null only if the Quest went private between the two reads: show it without likes and comments.
  const social = (await getQuestSocial(result.trip.key)) ?? EMPTY_SOCIAL;
  return <TripView trip={result.trip} social={{ mode: 'live', initial: social }} />;
}

const EMPTY_SOCIAL = { likeCount: 0, commentCount: 0, commentsOn: false, comments: [] };

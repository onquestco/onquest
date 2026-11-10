import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { getQuestStatus } from '@/features/trip-page/getQuestStatus';
import { getTrip } from '@/features/trip-page/getTrip';
import { previewCoverUrl } from '@/features/trip-page/previewCover';
import { QuestPreviewImage } from '@/features/trip-page/QuestPreviewImage';
import { UNAVAILABLE_TITLES } from '@/features/trip-page/QuestUnavailable';

type Props = { params: Promise<{ handle: string; slug: string }> };

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'A Quest on OnQuest';

export default async function Image({ params }: Props) {
  const { handle, slug } = await params;
  const result = await getTrip(handle, slug);
  if (!result) {
    // Private and removed links get a plain card: no photo, no title.
    const status = await getQuestStatus(handle, slug);
    if (!status) notFound();
    return new ImageResponse(
      <QuestPreviewImage title={UNAVAILABLE_TITLES[status]} handle={handle.toLowerCase()} coverUrl={null} />,
      size,
    );
  }

  const { trip, photoFolder } = result;
  const coverUrl = trip.cover ? await previewCoverUrl(photoFolder, trip.cover.id) : null;
  return new ImageResponse(
    <QuestPreviewImage
      title={trip.title}
      subtitle={trip.dateLabel}
      handle={trip.traveler.handle}
      coverUrl={coverUrl}
    />,
    size,
  );
}

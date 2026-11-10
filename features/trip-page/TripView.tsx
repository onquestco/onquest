import type { QuestSocial, ViewerState } from '@/lib/social/schema';
import type { TripData } from '@/lib/trip/types';
import { getTemplate } from '@/templates/registry';
import { DemoSocialProvider } from './DemoSocialProvider';
import { serializeJsonLd, tripJsonLd } from './jsonLd';
import { MakeYourOwnBar } from './MakeYourOwnBar';
import { QuestByline } from './QuestByline';
import { QuestFullscreen } from './QuestFullscreen';
import { QuestSocial as QuestSocialSection } from './QuestSocial';

type Props = {
  trip: TripData;
  /** Likes, comments and who is looking. Sample data until B-05/B-07 wire the real loaders. */
  social?: { initial: QuestSocial; viewer: ViewerState; openComposer?: boolean };
};

/** The Quest page (screen 9): the template's pages, then byline, likes, comments, and the sticky bar. */
export function TripView({ trip, social }: Props) {
  const { TripPage } = getTemplate(trip.templateId);
  const path = new URL(trip.url).pathname;
  const isOwner = social?.viewer.isOwner ?? false;

  const page = (
    <>
      <TripPage trip={trip} controls={<QuestFullscreen withLike={Boolean(social)} />} />
      <div className="bg-surface">
        <div className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-8">
          <QuestByline traveler={trip.traveler} />
          {social && <QuestSocialSection openComposer={social.openComposer} />}
        </div>
      </div>
      {!isOwner && <MakeYourOwnBar signedIn={social?.viewer.signedIn ?? false} tripKey={trip.key} />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(tripJsonLd(trip)) }}
      />
    </>
  );

  if (!social) return page;
  return (
    <DemoSocialProvider tripKey={trip.key} path={path} initial={social.initial} viewer={social.viewer}>
      {page}
    </DemoSocialProvider>
  );
}

import type { QuestSocial, ViewerState } from '@/lib/social/schema';
import type { TripData } from '@/lib/trip/types';
import { getTemplate } from '@/templates/registry';
import { DemoSocialProvider } from './DemoSocialProvider';
import { serializeJsonLd, tripJsonLd } from './jsonLd';
import { LiveSocialProvider } from './LiveSocialProvider';
import { MakeYourOwnBar } from './MakeYourOwnBar';
import { QuestFullscreen } from './QuestFullscreen';
import { QuestTopBar } from './QuestTopBar';
import { QuestSocial as QuestSocialSection } from './QuestSocial';

type Props = {
  trip: TripData;
  /**
   * Likes and comments. `live`: the real Quest page (server actions, viewer asked from /me after
   * load). `demo`: /demo's sample data with a chosen viewer.
   */
  social:
    | { mode: 'live'; initial: QuestSocial; ownerKey?: string }
    | { mode: 'demo'; initial: QuestSocial; viewer: ViewerState; openComposer?: boolean };
};

/** The Quest page (screen 9): the template's pages, then byline, likes, comments, and the sticky bar. */
export function TripView({ trip, social }: Props) {
  const { TripPage } = getTemplate(trip.templateId);
  const path = new URL(trip.url).pathname;

  const page = (
    <>
      <QuestTopBar />
      <TripPage trip={trip} controls={<QuestFullscreen withLike />} />
      <div className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-lg flex-col px-4 pt-3.5 pb-6">
          <QuestSocialSection traveler={trip.traveler} />
        </div>
      </div>
      <MakeYourOwnBar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(tripJsonLd(trip)) }}
      />
    </>
  );

  if (social.mode === 'live') {
    return (
      <LiveSocialProvider tripKey={trip.key} path={path} initial={social.initial} ownerKey={social.ownerKey}>
        {page}
      </LiveSocialProvider>
    );
  }
  return (
    <DemoSocialProvider
      tripKey={trip.key}
      path={path}
      initial={social.initial}
      viewer={social.viewer}
      startComposerOpen={social.openComposer}
    >
      {page}
    </DemoSocialProvider>
  );
}

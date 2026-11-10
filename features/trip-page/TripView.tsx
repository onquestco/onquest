import type { QuestSocial, ViewerState } from '@/lib/social/schema';
import type { TripData } from '@/lib/trip/types';
import { getTemplate } from '@/templates/registry';
import { DemoSocialProvider } from './DemoSocialProvider';
import { serializeJsonLd, tripJsonLd } from './jsonLd';
import { LiveSocialProvider } from './LiveSocialProvider';
import { MakeYourOwnBar } from './MakeYourOwnBar';
import { QuestByline } from './QuestByline';
import { QuestFullscreen } from './QuestFullscreen';
import { QuestSocial as QuestSocialSection } from './QuestSocial';

type Props = {
  trip: TripData;
  /**
   * Likes and comments. `live`: the real Quest page (server actions, viewer asked from /me after
   * load). `demo`: /demo's sample data with a chosen viewer.
   */
  social:
    | { mode: 'live'; initial: QuestSocial }
    | { mode: 'demo'; initial: QuestSocial; viewer: ViewerState; openComposer?: boolean };
};

/** The Quest page (screen 9): the template's pages, then byline, likes, comments, and the sticky bar. */
export function TripView({ trip, social }: Props) {
  const { TripPage } = getTemplate(trip.templateId);
  const path = new URL(trip.url).pathname;

  const page = (
    <>
      <TripPage trip={trip} controls={<QuestFullscreen withLike />} />
      <div className="bg-surface">
        <div className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-8">
          <QuestByline traveler={trip.traveler} />
          <QuestSocialSection />
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
      <LiveSocialProvider tripKey={trip.key} path={path} initial={social.initial}>
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

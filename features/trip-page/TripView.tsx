import type { QuestSocial, ViewerState } from '@/lib/social/schema';
import type { TripData } from '@/lib/trip/types';
import { toQuestPages } from '@/templates/shared/pages';
import { getTemplate } from '@/templates/registry';
import { DemoSocialProvider } from './DemoSocialProvider';
import { serializeJsonLd, tripJsonLd } from './jsonLd';
import { LiveSocialProvider } from './LiveSocialProvider';
import { MakeYourOwnBar } from './MakeYourOwnBar';
import { QuestEvents } from './QuestEvents';
import { QuestFullscreen } from './QuestFullscreen';
import { QuestTopBar } from './QuestTopBar';
import { QuestSocial as QuestSocialSection } from './QuestSocial';
import { templateCode } from './templateCode';

type Props = {
  trip: TripData;
  /**
   * Likes and comments. `live`: the real Quest page (server actions, viewer asked from /me after
   * load). `demo`: /demo's sample data with a chosen viewer.
   */
  social:
    | { mode: 'live'; initial: QuestSocial; ownerKey?: string; unlisted?: boolean }
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
    // Analytics only on the real page (not /demo): the same pages the template plays.
    const pages = toQuestPages(trip);
    const viewFacts = {
      unlisted: social.unlisted ?? false,
      template: templateCode(trip.templateId),
      pageCount: pages.filter((item) => item.kind === 'photos').length,
    };
    return (
      <LiveSocialProvider
        tripKey={trip.key}
        path={path}
        initial={social.initial}
        ownerKey={social.ownerKey}
        viewFacts={viewFacts}
      >
        <QuestEvents questKey={trip.key} path={path} totalPages={pages.length}>
          {page}
        </QuestEvents>
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

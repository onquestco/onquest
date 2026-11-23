import type { FeedPage } from '@/lib/social/schema';
import type { QuestCard } from '@/lib/trip/cards';
import { HomeBanner } from './HomeBanner';
import { HomeFeed } from './HomeFeed';
import { YourQuestsRow } from './YourQuestsRow';

type Props = {
  signedIn: boolean;
  name: string | null;
  yourQuests: QuestCard[];
  feed: FeedPage | null;
  suggested: QuestCard[];
};

/** Screen 11: the banner, your Quests, the feed and suggestions. */
export function HomeView({ signedIn, name, yourQuests, feed, suggested }: Props) {
  return (
    <main className="mx-auto flex max-w-lg md:max-w-3xl flex-col gap-8 px-4 py-4">
      <HomeBanner firstName={name?.split(' ')[0]} />
      {signedIn && <YourQuestsRow initial={yourQuests} />}
      <HomeFeed signedIn={signedIn} first={feed} suggested={suggested} />
    </main>
  );
}

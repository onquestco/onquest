import type { FeedPage } from '@/lib/social/schema';
import type { QuestCard } from '@/lib/trip/cards';
import { HomeBanner } from './HomeBanner';
import { HomeFeed } from './HomeFeed';
import { YourQuestsRow } from './YourQuestsRow';

type Props = {
  name: string | null;
  yourQuests: QuestCard[];
  feed: FeedPage | null;
  suggested: QuestCard[];
};

/** Screen 11: the banner, your Quests, the feed and suggestions. */
export function HomeView({ name, yourQuests, feed, suggested }: Props) {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-4">
      <HomeBanner firstName={name?.split(' ')[0]} />
      <YourQuestsRow initial={yourQuests} />
      <HomeFeed first={feed} suggested={suggested} />
    </main>
  );
}

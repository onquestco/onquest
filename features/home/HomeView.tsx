import { HomeBanner } from './HomeBanner';

/** Screen 11. Your Quests and the feed join once Quests are saved (A-04) and C-03 lands. */
export function HomeView({ name }: { name: string | null }) {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-4">
      <HomeBanner firstName={name?.split(' ')[0]} />
      <section className="flex flex-col gap-2">
        <h2 className="text-lead font-semibold text-ink">Your Quests</h2>
        <p className="text-body text-ink-muted">No Quests yet. Your next trip starts here.</p>
      </section>
    </main>
  );
}

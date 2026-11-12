import { TopBar } from '@/design-system/components/TopBar';
import type { Person } from '@/lib/social/schema';
import { FollowList } from './FollowList';
import type { ProfileView } from './getProfile';

type Props = { kind: 'followers' | 'following'; profile: ProfileView; people: Person[]; me: string };

/** Screen 18: someone's followers, or who they follow. */
export function FollowsView({ kind, profile, people, me }: Props) {
  return (
    <>
      <TopBar title={kind === 'followers' ? 'Followers' : 'Following'} fallback={`/@${profile.handle}`} />
      <main className="mx-auto flex min-h-svh max-w-lg flex-col gap-4 bg-surface-page px-4 py-4">
        <FollowList kind={kind} people={people} me={me} />
      </main>
    </>
  );
}

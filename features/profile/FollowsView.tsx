import Link from 'next/link';
import { buttonClassName } from '@/design-system/components/Button';
import type { Person } from '@/lib/social/schema';
import { FollowList } from './FollowList';
import type { ProfileView } from './getProfile';

type Props = { kind: 'followers' | 'following'; profile: ProfileView; people: Person[]; me: string };

/** Screen 18: someone's followers, or who they follow. */
export function FollowsView({ kind, profile, people, me }: Props) {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-4">
      <header className="flex items-center gap-2">
        <Link href={`/@${profile.handle}`} className={buttonClassName({ variant: 'quiet' })}>
          Back
        </Link>
        <h1 className="text-lead font-semibold text-ink">
          {kind === 'followers' ? `${profile.name}'s followers` : `${profile.name} follows`}
        </h1>
      </header>
      <FollowList kind={kind} people={people} me={me} />
    </main>
  );
}

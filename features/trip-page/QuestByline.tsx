import Link from 'next/link';
import { Avatar } from '@/design-system/components/Avatar';
import type { TripData } from '@/lib/trip/types';

/** Under the last page: who made this Quest. Follow joins here with spec C (C-09). */
export function QuestByline({ traveler }: { traveler: TripData['traveler'] }) {
  return (
    <Link href={`/@${traveler.handle}`} className="flex min-h-11 items-center gap-3">
      <Avatar name={traveler.name} src={traveler.avatar?.thumb} size={40} />
      <span className="flex flex-col">
        <span className="text-body font-semibold text-ink">{traveler.name}</span>
        <span className="text-label font-normal text-ink-muted">@{traveler.handle}</span>
      </span>
    </Link>
  );
}

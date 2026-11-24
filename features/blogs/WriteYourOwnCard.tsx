'use client';

import Link from 'next/link';
import { buttonClassName } from '@/design-system/components/Button';
import { useQuestSocial } from '@/features/trip-page/useQuestSocial';

/**
 * The last thing on someone else's blog (PRD reader flow 5): "Write your own" opens the Create
 * chooser. Signed out, /create opens the sign-in popup (NEEDS_ACCOUNT). Hidden on your own blog.
 */
export function WriteYourOwnCard() {
  const { viewer, viewerKnown } = useQuestSocial();
  if (!viewerKnown || viewer.isOwner) return null;

  return (
    // The PRD gives this card no copy beyond its label, so it is the one button.
    <section aria-label="Write your own" className="rounded-lg bg-brand-wash px-4 py-4">
      <Link href="/create?source=write_your_own" className={buttonClassName({ block: true })}>
        Write your own
      </Link>
    </section>
  );
}

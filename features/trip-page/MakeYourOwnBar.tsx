'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buttonClassName } from '@/design-system/components/Button';
import { trackCreateClick } from '@/features/editor/trackCreateClick';
import { signInPath } from './socialActions';
import { useQuestSocial } from './useQuestSocial';

// The cached page can't know who is looking, so the bar waits up to this long for the viewer
// before showing, rather than flashing on the owner's own Quest (spec B §3.2).
const WAIT_FOR_VIEWER_MS = 300;

/**
 * Sticky at the bottom while scrolling (M12); never on your own Quest. Signed out it goes through
 * sign-in and lands on Pick photos (M1).
 */
export function MakeYourOwnBar() {
  const { viewer, viewerKnown, tripKey } = useQuestSocial();
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), WAIT_FOR_VIEWER_MS);
    return () => clearTimeout(timer);
  }, []);

  if (viewer.isOwner) return null;
  // Tagged so the draft counts it as "Make your own Quest", not the Create menu.
  const href = viewer.signedIn
    ? '/quests/new?source=make_your_own'
    : signInPath('make_your_own', '/quests/new', tripKey);
  return (
    <div
      className={`sticky bottom-0 z-30 border-t border-line bg-surface px-4 pt-3 pb-4 ${
        viewerKnown || waited ? '' : 'invisible'
      }`}
    >
      <div className="mx-auto max-w-lg">
        {/* Someone else's Quest: whether the viewer has published isn't known here. */}
        <Link
          href={href}
          onClick={() => trackCreateClick({ source: 'make_your_own', contentId: tripKey })}
          className={buttonClassName({ block: true })}
        >
          Make your own Quest
        </Link>
      </div>
    </div>
  );
}

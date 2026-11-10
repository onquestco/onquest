import Link from 'next/link';
import { buttonClassName } from '@/design-system/components/Button';
import { signInPath } from './socialActions';

/**
 * Sticky at the bottom while scrolling (M12); never on your own Quest. Signed out it goes through
 * sign-in and lands on Pick photos (M1).
 */
export function MakeYourOwnBar({ signedIn, tripKey }: { signedIn: boolean; tripKey: string }) {
  const href = signedIn ? '/quests/new' : signInPath('make_your_own', '/quests/new', tripKey);
  return (
    <div className="sticky bottom-0 z-30 border-t border-line bg-surface px-4 pt-3 pb-4">
      <Link href={href} className={`${buttonClassName({ block: true })} mx-auto max-w-lg`}>
        Make your own Quest
      </Link>
    </div>
  );
}

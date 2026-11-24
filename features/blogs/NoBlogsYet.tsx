import Link from 'next/link';
import { buttonClassName } from '@/design-system/components/Button';

/** Your own Blogs list with nothing in it yet (PRD B6). Only shown to people who can write one. */
export function NoBlogsYet() {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-body text-ink-muted">No blogs yet. Write about a trip.</p>
      <Link href="/blogs/new?source=create" className={buttonClassName({ variant: 'secondary' })}>
        Write a blog
      </Link>
    </div>
  );
}

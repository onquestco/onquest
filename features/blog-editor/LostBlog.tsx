import Link from 'next/link';
import { buttonClassName } from '@/design-system/components/Button';

/** The composer or share screen for a blog that's gone (deleted elsewhere, or never this person's). */
export function LostBlog() {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-body text-ink">This blog isn&apos;t here any more.</p>
      <Link href="/blogs/new" className={buttonClassName()}>
        Write a blog
      </Link>
    </main>
  );
}

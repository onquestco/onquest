import { Logo } from '@/design-system/components/Logo';
import { BlogUnavailableActions } from './BlogUnavailableActions';
import type { BlogStatus } from './getBlogStatus';

const COPY = {
  private: 'This blog is private.',
  removed: 'This blog was removed.',
} as const satisfies Record<BlogStatus, string>;

type Props = {
  reason: BlogStatus;
  /** The link's handle and slug: on a private link the writer gets "Open your blog". */
  url: { handle: string; slug: string };
};

/** Private and removed blog links (PRD B7, B11): the message and nothing else. */
export function BlogUnavailable({ reason, url }: Props) {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-6 bg-surface px-4 text-center">
      <Logo />
      <h1 className="text-title text-ink">{COPY[reason]}</h1>
      <BlogUnavailableActions checkOwner={reason === 'private' ? url : undefined} />
    </main>
  );
}

export const UNAVAILABLE_BLOG_TITLES = COPY;

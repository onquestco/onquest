'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { buttonClassName } from '@/design-system/components/Button';

const AnswerSchema = z.object({ ownerBlogKey: z.uuid().nullable() });

type Props = {
  /** Set on private links: asks whether the person looking wrote the blog. */
  checkOwner?: { handle: string; slug: string };
};

/**
 * "Go to OnQuest", or "Open your blog" for the writer of a private one. The page is cached, so
 * the browser asks /api/unavailable-blog, which tells only the writer the blog's key.
 */
export function BlogUnavailableActions({ checkOwner }: Props) {
  const [ownerBlogKey, setOwnerBlogKey] = useState<string | null>(null);
  const handle = checkOwner?.handle;
  const slug = checkOwner?.slug;

  useEffect(() => {
    if (!handle || !slug) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ handle, slug });
    fetch(`/api/unavailable-blog?${query.toString()}`, { cache: 'no-store', signal: controller.signal })
      .then((response) => response.json())
      .then((body: unknown) => {
        const answer = AnswerSchema.safeParse(body);
        if (answer.success) setOwnerBlogKey(answer.data.ownerBlogKey);
      })
      .catch(() => {}); // stays "Go to OnQuest"
    return () => controller.abort();
  }, [handle, slug]);

  return (
    <div className="flex w-full flex-col gap-2">
      {ownerBlogKey && (
        <Link href={`/blogs/${ownerBlogKey}`} className={buttonClassName({ block: true })}>
          Open your blog
        </Link>
      )}
      <Link href="/" className={buttonClassName({ variant: ownerBlogKey ? 'quiet' : 'primary', block: true })}>
        Go to OnQuest
      </Link>
    </div>
  );
}

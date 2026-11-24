'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Toast } from '@/design-system/components/Toast';
import type { BlogCard } from '@/lib/blog/cards';
import { BlogRow } from './BlogRow';
import { ManageBlogSheet, type ManagedBlog } from './ManageBlogSheet';

/** What the ⋯ menu needs from an own card, or null for a draft (drafts open the composer instead). */
export function managedFromCard(blog: BlogCard): ManagedBlog | null {
  if (blog.status !== 'published' || !blog.path) return null;
  return {
    key: blog.key,
    title: blog.title,
    path: blog.path,
    visibility: blog.visibility,
    commentsOn: blog.commentsOn ?? true,
    savedAt: blog.savedAt,
  };
}

type Props = {
  blogs: BlogCard[];
  /** Your own list: tags, ⋯ on posted blogs, drafts open the composer. */
  own?: boolean;
  /** Another device changed a blog first: load the list again. */
  onReload?: () => void;
};

/**
 * A one-column list of blogs (profile Blogs, Quests tab Blogs). On your own list, ⋯ opens the
 * blog's menu right here (Edit, Share link, Who can see it, Comments, Delete).
 */
export function BlogList({ blogs: initial, own = false, onReload }: Props) {
  const router = useRouter();
  const [blogs, setBlogs] = useState(initial);
  const [loaded, setLoaded] = useState(initial);
  const [managing, setManaging] = useState<string>();
  const [notice, setNotice] = useState<string>();
  // A new list from the server (a reload after a conflict, or the own list arriving): take it.
  if (initial !== loaded) {
    setLoaded(initial);
    setBlogs(initial);
  }
  const open = blogs.find((blog) => blog.key === managing);
  const managed = open ? managedFromCard(open) : null;

  return (
    <>
      <ul className="flex flex-col gap-2">
        {blogs.map((blog) => (
          <li key={blog.key}>
            <BlogRow
              blog={blog}
              own={own}
              onManage={own && managedFromCard(blog) ? () => setManaging(blog.key) : undefined}
            />
          </li>
        ))}
      </ul>
      {managed && (
        <ManageBlogSheet
          key={managed.key}
          blog={managed}
          onClose={() => setManaging(undefined)}
          onChange={(changed) => {
            setBlogs((list) =>
              list.map((blog) =>
                blog.key === changed.key
                  ? { ...blog, visibility: changed.visibility, commentsOn: changed.commentsOn, savedAt: changed.savedAt }
                  : blog,
              ),
            );
            // The public profile and lists read the blog again (the action refreshed their tags).
            router.refresh();
          }}
          onConflict={() => {
            onReload?.();
            router.refresh();
          }}
          onDeleted={() => {
            setBlogs((list) => list.filter((blog) => blog.key !== managed.key));
            setManaging(undefined);
            setNotice('Blog deleted.');
            router.refresh();
          }}
        />
      )}
      {notice && <Toast message={notice} onDismiss={() => setNotice(undefined)} />}
    </>
  );
}

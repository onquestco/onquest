'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Toast } from '@/design-system/components/Toast';
import type { BlogCard } from '@/lib/blog/cards';
import { BlogRow } from './BlogRow';
import { ManageBlogSheet, type ManagedBlog } from './ManageBlogSheet';
import { ManageDraftSheet, type ManagedDraft } from './ManageDraftSheet';
import { NoBlogsYet } from './NoBlogsYet';

/** What the posted blog's ⋯ menu needs from an own card, or null for a draft (ManageDraftSheet). */
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

/** What a never-posted blog's ⋯ menu needs, or null for a posted one. */
export function draftFromCard(blog: BlogCard): ManagedDraft | null {
  if (blog.status !== 'draft') return null;
  return { key: blog.key, title: blog.title, ownerKey: blog.owner.key };
}

type Props = {
  blogs: BlogCard[];
  /** Your own list: tags, and ⋯ on every row (a draft's menu offers Continue editing and Delete draft). */
  own?: boolean;
  /** Another device changed a blog first: load the list again. */
  onReload?: () => void;
};

/**
 * A one-column list of blogs (profile Blogs, Quests tab Blogs). On your own list, ⋯ opens the
 * blog's menu right here (Edit, Share link, Who can see it, Comments, Delete), or a draft's
 * (Continue editing, Delete draft).
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
  const managedDraft = open ? draftFromCard(open) : null;
  const canManage = (blog: BlogCard) => own && (managedFromCard(blog) !== null || draftFromCard(blog) !== null);
  // The last draft deleted here: show the empty state now, before the server list arrives.
  const emptied = own && initial.length > 0 && blogs.length === 0;

  return (
    <>
      {emptied && <NoBlogsYet />}
      <ul className="flex flex-col gap-2">
        {blogs.map((blog) => (
          <li key={blog.key}>
            <BlogRow
              blog={blog}
              own={own}
              onManage={canManage(blog) ? () => setManaging(blog.key) : undefined}
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
      {managedDraft && (
        <ManageDraftSheet
          key={managedDraft.key}
          draft={managedDraft}
          onClose={() => setManaging(undefined)}
          onDeleted={() => {
            setBlogs((list) => list.filter((blog) => blog.key !== managedDraft.key));
            setManaging(undefined);
            setNotice('Draft deleted.');
            router.refresh();
          }}
          onPosted={() => {
            setManaging(undefined);
            setNotice('This blog was posted on another device. Showing the latest.');
            onReload?.();
          }}
        />
      )}
      {notice && <Toast message={notice} onDismiss={() => setNotice(undefined)} />}
    </>
  );
}

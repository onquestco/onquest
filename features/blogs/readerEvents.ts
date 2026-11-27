import { REFERRER_CODE } from '@/lib/analytics/codes';
import type { BlogViewer } from '@/lib/social/schema';
import type { BlogReferrer } from './blogReferrer';

/**
 * Whether this page view counts as a reader's (blog_viewed, blog_read_end, blog_quest_click):
 * never on the writer's own view (/blogs/[key]), and never when the viewer is the writer, however
 * they got to the public link (BL-04 review S2). Until the viewer is known it counts, so read-end
 * time starts on open; blog_viewed itself waits for the viewer, and every event checks again
 * when it fires.
 */
export function countsAsReader(trackReading: boolean, viewer: BlogViewer | null): boolean {
  return trackReading && !viewer?.isOwner;
}

type ReaderView = { blogKey: string; viewId: string };

/** blog_viewed, once the viewer is known. The writer's key, never their handle. */
export function blogViewedProperties(
  view: ReaderView & { authorKey: string; signedIn: boolean; referrer: BlogReferrer; hasQuest: boolean },
) {
  return {
    blog_id: view.blogKey,
    view_id: view.viewId,
    author_user_id: view.authorKey,
    signed_in_flg: view.signedIn,
    referrer: REFERRER_CODE[view.referrer],
    has_quest_flg: view.hasQuest,
  };
}

/** blog_quest_click: "View Quest" on the linked Quest card. */
export function questClickProperties(view: ReaderView) {
  return { blog_id: view.blogKey, view_id: view.viewId };
}

/** blog_read_end: whole seconds of visible time when the end came into view. */
export function readEndProperties(view: ReaderView, seconds: number) {
  return { blog_id: view.blogKey, view_id: view.viewId, seconds };
}

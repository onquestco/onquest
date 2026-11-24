import type { BlogViewer } from '@/lib/social/schema';

/**
 * Whether this page view counts as a reader's (blog_viewed, blog_read_end, blog_quest_opened):
 * never on the writer's own view (/blogs/[key]), and never when the viewer is the writer, however
 * they got to the public link (BL-04 review S2). Until the viewer is known it counts, so read-end
 * time starts on open; blog_viewed itself waits for the viewer, and every event checks again
 * when it fires.
 */
export function countsAsReader(trackReading: boolean, viewer: BlogViewer | null): boolean {
  return trackReading && !viewer?.isOwner;
}

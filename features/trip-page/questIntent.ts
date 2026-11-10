import { SignInIntentSchema, type SignInIntent } from '@/lib/auth/next';

// After sign-in the person lands back on the Quest with ?intent=like or ?intent=comment (and ?ref).
// The page is cached and never reads the query on the server, so the browser finishes the tap.

type Intent = Extract<SignInIntent, 'like' | 'comment'>;

/** The intent in a Quest URL's query, if it's one the Quest page finishes. */
export function readQuestIntent(search: string): Intent | null {
  const intent = SignInIntentSchema.safeParse(new URLSearchParams(search).get('intent'));
  return intent.success && (intent.data === 'like' || intent.data === 'comment') ? intent.data : null;
}

/** The same URL without intent and ref, so a reload or a shared link doesn't like it again. */
export function withoutIntent(path: string, search: string, hash: string): string {
  const query = new URLSearchParams(search);
  query.delete('intent');
  query.delete('ref');
  const rest = query.toString();
  return `${path}${rest ? `?${rest}` : ''}${hash}`;
}

/** What to do once the viewer is known. A like is only sent if it isn't liked already. */
export function intentStep(
  intent: Intent | null,
  viewer: { signedIn: boolean; liked: boolean },
): 'like' | 'open_comments' | null {
  if (!intent || !viewer.signedIn) return null;
  if (intent === 'comment') return 'open_comments';
  return viewer.liked ? null : 'like';
}

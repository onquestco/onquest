// blog_viewed.referrer (spec §10): where the reader came from, as one of four words. Never the
// referring URL itself.

export type BlogReferrer = 'whatsapp' | 'instagram' | 'other' | 'none';

export function blogReferrer(referrer: string, ownOrigin: string): BlogReferrer {
  if (!referrer) return 'none';
  let host: string;
  try {
    const url = new URL(referrer);
    // Moving around OnQuest itself isn't a referral.
    if (url.origin === ownOrigin) return 'none';
    host = url.hostname.toLowerCase();
  } catch {
    return 'other';
  }
  if (host === 'wa.me' || host === 'whatsapp.com' || host.endsWith('.whatsapp.com')) return 'whatsapp';
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) return 'instagram';
  return 'other';
}

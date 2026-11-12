export const SITE_NAME = 'OnQuest';

/** Absolute base URL, without a trailing slash. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/** "See an example" in What's a Quest. The Goa sample until a real example Quest is published. */
export const EXAMPLE_QUEST_PATH = '/demo';

/** Settings → Send feedback (a mailto link). Founder to confirm the address. */
export const SUPPORT_EMAIL = 'support@onquest.in';

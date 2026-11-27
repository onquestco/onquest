import { ENTRY_TYPE_CODE } from './codes';
import { landingPageFor } from './screens';

// How a visit arrived: the ?src=<code> tag on in-app links (docs/specs/analytics-v2.md §4.4),
// ?src=email on notification emails (AN-09) and app_opened's properties. The page reads the tag
// once and takes it out of the address bar, so it's never shared onwards.

export type Src = number | 'email';
const SRC_VALUE = /^(email|\d{1,2})$/;

/** `href` with ?src=<code> added (or replaced), keeping its other query and hash. */
export function withSrc(href: string, code: Src): string {
  const [beforeHash = '', hash] = href.split('#', 2);
  const [path = '', query = ''] = beforeHash.split('?', 2);
  const params = new URLSearchParams(query);
  params.set('src', String(code));
  return `${path}?${params.toString()}${hash === undefined ? '' : `#${hash}`}`;
}

/** The tag in a query string, or null when it's missing or not a plain code. */
export function readSrc(search: string): Src | null {
  const value = new URLSearchParams(search).get('src');
  if (!value || !SRC_VALUE.test(value)) return null;
  return value === 'email' ? 'email' : Number(value);
}

/** The same query string without ?src=. */
export function withoutSrc(search: string): string {
  const params = new URLSearchParams(search);
  params.delete('src');
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}

let taken: { path: string; src: Src | null } | undefined;

/**
 * Browser only. The current page's ?src=, read once per page and removed with
 * history.replaceState; later calls on the same page get the same answer.
 */
export function takeSrc(): Src | null {
  if (typeof window === 'undefined') return null;
  const { pathname, search, hash } = window.location;
  if (taken?.path === pathname && !search.includes('src=')) return taken.src;
  const src = readSrc(search);
  taken = { path: pathname, src };
  if (new URLSearchParams(search).has('src')) {
    window.history.replaceState(window.history.state, '', `${pathname}${withoutSrc(search)}${hash}`);
  }
  return src;
}

// app_opened ----------------------------------------------------------------------------------

/** Landing pages someone usually reaches from a link sent to them. */
const CONTENT_PAGES = new Set(['/@[handle]', '/@[handle]/[slug]', '/@[handle]/blog/[slug]', '/guides/[slug]']);

export type ArrivalInput = {
  template: string;
  src: Src | null;
  /** document.referrer's host is another site (an empty referrer is not). */
  externalReferrer: boolean;
  signedInHint: boolean;
  firstOpen: boolean;
  utmSource: string | null;
};

/**
 * entry_type: an email link is 2; a content page reached without an in-app tag is a shared link
 * (1; in-app browsers often send no referrer); any other page from another site is 4; else 0.
 */
export function entryTypeFor(input: Pick<ArrivalInput, 'template' | 'src' | 'externalReferrer'>) {
  if (input.src === 'email') return ENTRY_TYPE_CODE.email;
  if (input.src === null && CONTENT_PAGES.has(input.template)) return ENTRY_TYPE_CODE.shared_link;
  if (input.src === null && input.externalReferrer) return ENTRY_TYPE_CODE.other;
  return ENTRY_TYPE_CODE.default;
}

/**
 * app_opened's properties. signed_in_flg is the browser's guess; /ingest replaces it with the
 * verified session. landing_page is left out for pages outside the sheet's 0–6 (spec §14).
 */
export function appOpenedProperties(input: ArrivalInput) {
  return {
    landing_page: landingPageFor(input.template),
    entry_type: entryTypeFor(input),
    signed_in_flg: input.signedInHint,
    first_open_flg: input.firstOpen,
    utm_source: input.utmSource ?? undefined,
  };
}

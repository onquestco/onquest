// Pageviews carry the route pattern, never a real handle, slug or key (spec A §3.9):
// "/@riya/goa-k3f9x2" → "/@[handle]/[slug]", "/quests/<uuid>/review" → "/quests/[key]/review".

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIXED = new Set([
  '/',
  '/home',
  '/explore',
  '/quests',
  '/quests/new',
  '/blogs/new',
  '/create',
  '/notifications',
  '/settings',
  '/settings/profile',
  '/login',
  '/onboarding',
  '/welcome',
  '/privacy',
  '/terms',
  '/demo',
]);

/** "/quests/<key>/…" and "/blogs/<key>/…": every uuid segment becomes "[key]". */
function keyed(parts: string[]): string {
  return ['', parts[0], '[key]', ...parts.slice(2).map((part) => (UUID.test(part) ? '[key]' : part))].join('/');
}

export function routeTemplate(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (FIXED.has(path)) return path;
  const parts = path.split('/').slice(1);
  if (parts[0]?.startsWith('@')) {
    if (parts.length === 1) return '/@[handle]';
    if (parts[1] === 'followers' || parts[1] === 'following') return `/@[handle]/${parts[1]}`;
    // Three segments: no Quest slug can be "blog" (next.config.ts rewrites).
    if (parts[1] === 'blog' && parts.length === 3) return '/@[handle]/blog/[slug]';
    return '/@[handle]/[slug]';
  }
  if ((parts[0] === 'quests' || parts[0] === 'blogs') && parts[1] && UUID.test(parts[1])) return keyed(parts);
  if (parts[0] === 'guides' && parts.length === 2) return '/guides/[slug]';
  return '/[other]';
}

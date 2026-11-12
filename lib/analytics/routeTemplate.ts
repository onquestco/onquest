// Pageviews carry the route pattern, never a real handle, slug or key (spec A §3.9):
// "/@riya/goa-k3f9x2" → "/@[handle]/[slug]", "/quests/<uuid>/review" → "/quests/[key]/review".

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIXED = new Set([
  '/',
  '/home',
  '/explore',
  '/quests',
  '/quests/new',
  '/notifications',
  '/settings',
  '/settings/profile',
  '/login',
  '/onboarding',
  '/welcome',
  '/demo',
]);

export function routeTemplate(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (FIXED.has(path)) return path;
  const parts = path.split('/').slice(1);
  if (parts[0]?.startsWith('@')) {
    if (parts.length === 1) return '/@[handle]';
    if (parts[1] === 'followers' || parts[1] === 'following') return `/@[handle]/${parts[1]}`;
    return '/@[handle]/[slug]';
  }
  if (parts[0] === 'quests' && parts[1] && UUID.test(parts[1])) {
    return ['/quests/[key]', ...parts.slice(2).map((part) => (UUID.test(part) ? '[key]' : part))].join('/');
  }
  if (parts[0] === 'guides' && parts.length === 2) return '/guides/[slug]';
  return '/[other]';
}

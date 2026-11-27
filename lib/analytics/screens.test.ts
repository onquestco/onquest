import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FROM_SCREEN_CODE } from './codes';
import { routeTemplate } from './routeTemplate';
import { fromScreenFor, landingPageFor, SCREEN_ROUTES, SCREENS, screenFor } from './screens';

// docs/specs/analytics-v2.md §6.1: every page a user can open, as the browser sees its URL,
// maps through routeTemplate to a row of the screens table (or is one of the known "other" pages).

const root = process.cwd();
const KNOWN_OTHER = ['/', '/quests/[key]/export', '/blogs/[key]', '/blogs/[key]/share', '/demo'];

/** Every page.tsx under app/, as a route with the route-group segments removed. */
function appRoutes(): string[] {
  const walk = (folder: string): string[] =>
    readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) return walk(path);
      return entry.name === 'page.tsx' ? [path] : [];
    });
  return walk(join(root, 'app')).map((file) => {
    const segments = relative(join(root, 'app'), file).split(/[\\/]/).slice(0, -1);
    return `/${segments.filter((segment) => !/^\(.*\)$/.test(segment)).join('/')}`;
  });
}

/** next.config.ts rewrites as [public source, app destination], with :param written as [param]. */
function rewrites(): [string, string][] {
  const config = readFileSync(join(root, 'next.config.ts'), 'utf8');
  const asRoute = (pattern: string) => pattern.replace(/:(\w+)/g, '[$1]');
  return [...config.matchAll(/source:\s*'([^']+)',\s*destination:\s*'([^']+)'/g)].map(
    ([, source = '', destination = '']) => [asRoute(source), asRoute(destination)],
  );
}

/** The URL people see for an app route (the rewrite reversed), or the route itself. */
function publicRoute(route: string, map: [string, string][]): string {
  const match = map.find(([, destination]) => destination === route);
  if (match) return match[0];
  // A rewrite target with no rewrite would be a page nobody can reach by its public URL.
  expect(route, `${route} needs a rewrite in next.config.ts`).not.toMatch(/^\/(u|b)\//);
  return route;
}

/** A real-looking path for a route template. */
function samplePath(route: string): string {
  return route
    .replace(/\[key\]/g, '0f8c06e0-ff8e-4996-ada5-c17de627ae88')
    .replace('[handle]', 'riya')
    .replace('[slug]', 'goa-k3f9x2');
}

describe('screens', () => {
  const map = rewrites();
  const routes = appRoutes().map((route) => publicRoute(route, map));

  it('reads the rewrites and finds the pages', () => {
    expect(map).toContainEqual(['/@[handle]/blog/[slug]', '/b/[handle]/[slug]']);
    expect(routes).toContain('/@[handle]/[slug]');
    expect(routes).toContain('/@[handle]/blog/[slug]');
    expect(routes).toContain('/@[handle]/followers');
  });

  it.each(appRoutes().map((route) => [route]))('%s maps to a row of the screens table', (route) => {
    const visible = publicRoute(route, map);
    const template = routeTemplate(samplePath(visible));
    expect(template).toBe(visible);
    expect(SCREEN_ROUTES.includes(template) || KNOWN_OTHER.includes(template)).toBe(true);
  });

  it('matches the spec table', () => {
    expect(screenFor('/@[handle]/blog/[slug]')).toBe('blog_page');
    expect(fromScreenFor('/@[handle]/blog/[slug]')).toBe(5);
    expect(screenFor('/quests/[key]/share')).toBe('publish');
    expect(screenFor('/quests/[key]/arrange')).toBe('create_pick');
    expect(fromScreenFor('/quests/[key]/template')).toBe(8);
    expect([screenFor('/create'), fromScreenFor('/create')]).toEqual(['other', 10]);
    expect([screenFor('/blogs/[key]/edit'), fromScreenFor('/blogs/[key]/edit')]).toEqual(['blog_editor', 11]);
    expect(fromScreenFor('/guides/[slug]')).toBe(12);
    expect(fromScreenFor('/login')).toBe(13);
    expect(fromScreenFor('/welcome')).toBe(14);
    expect(fromScreenFor('/terms')).toBe(15);
    for (const other of KNOWN_OTHER) expect([screenFor(other), fromScreenFor(other)]).toEqual(['other', 9]);
    expect(screenFor('/[other]')).toBe('other');
  });

  it('never says unknown or server, and every value is a common.csv screen', () => {
    const common = readFileSync(join(root, 'docs', 'analytics', 'v2', 'common.csv'), 'utf8');
    const row = common.split('\n').find((line) => line.startsWith('screen,')) ?? '';
    for (const screen of SCREENS) expect(row).toContain(screen);
    expect(SCREENS).toHaveLength(15);
    for (const route of SCREEN_ROUTES) expect(SCREENS).toContain(screenFor(route));
    expect(Object.values(FROM_SCREEN_CODE)).toContain(fromScreenFor('/anything'));
  });

  it('landing_page only for the sheet’s seven pages', () => {
    expect(landingPageFor('/home')).toBe(0);
    expect(landingPageFor('/@[handle]/[slug]')).toBe(1);
    expect(landingPageFor('/@[handle]/blog/[slug]')).toBe(2);
    expect(landingPageFor('/@[handle]')).toBe(3);
    expect(landingPageFor('/explore')).toBe(4);
    expect(landingPageFor('/quests')).toBe(5);
    expect(landingPageFor('/create')).toBe(6);
    expect(landingPageFor('/guides/[slug]')).toBeUndefined();
  });
});

import { FROM_SCREEN_CODE, LANDING_PAGE_CODE } from './codes';

// The screen every event happened on, and the from_screen code, from the public route template
// (routeTemplate.ts). docs/specs/analytics-v2.md §6.1; screens.test.ts walks app/ to prove every
// page a user can open has a row here.

/** common.csv `screen` values. */
export const SCREENS = [
  'home',
  'explore',
  'quests',
  'profile',
  'quest_page',
  'blog_page',
  'create_pick',
  'create_review',
  'create_template',
  'create_preview',
  'publish',
  'settings',
  'notifications',
  'blog_editor',
  'other',
] as const;

export type Screen = (typeof SCREENS)[number];

type Row = { screen: Screen; fromScreen: (typeof FROM_SCREEN_CODE)[keyof typeof FROM_SCREEN_CODE] };

const code = FROM_SCREEN_CODE;
const ROWS: Record<string, Row> = {
  '/home': { screen: 'home', fromScreen: code.home },
  '/explore': { screen: 'explore', fromScreen: code.explore },
  '/quests': { screen: 'quests', fromScreen: code.quests_tab },
  '/@[handle]': { screen: 'profile', fromScreen: code.profile },
  '/@[handle]/followers': { screen: 'profile', fromScreen: code.profile },
  '/@[handle]/following': { screen: 'profile', fromScreen: code.profile },
  '/@[handle]/[slug]': { screen: 'quest_page', fromScreen: code.quest_page },
  '/@[handle]/blog/[slug]': { screen: 'blog_page', fromScreen: code.blog_page },
  '/settings': { screen: 'settings', fromScreen: code.settings },
  '/settings/profile': { screen: 'settings', fromScreen: code.settings },
  '/notifications': { screen: 'notifications', fromScreen: code.notifications },
  '/quests/new': { screen: 'create_pick', fromScreen: code.create_flow },
  '/quests/[key]/arrange': { screen: 'create_pick', fromScreen: code.create_flow },
  '/quests/[key]/review': { screen: 'create_review', fromScreen: code.create_flow },
  '/quests/[key]/template': { screen: 'create_template', fromScreen: code.create_flow },
  '/quests/[key]/preview': { screen: 'create_preview', fromScreen: code.create_flow },
  '/quests/[key]/share': { screen: 'publish', fromScreen: code.create_flow },
  '/create': { screen: 'other', fromScreen: code.create_page },
  '/blogs/new': { screen: 'blog_editor', fromScreen: code.blog_composer },
  '/blogs/[key]/edit': { screen: 'blog_editor', fromScreen: code.blog_composer },
  '/guides/[slug]': { screen: 'other', fromScreen: code.guide_page },
  '/login': { screen: 'other', fromScreen: code.sign_in },
  '/onboarding': { screen: 'other', fromScreen: code.welcome },
  '/welcome': { screen: 'other', fromScreen: code.welcome },
  '/privacy': { screen: 'other', fromScreen: code.legal },
  '/terms': { screen: 'other', fromScreen: code.legal },
};
const OTHER: Row = { screen: 'other', fromScreen: code.other };

/** Route templates with a row of their own (anything else is "other", from_screen 9). */
export const SCREEN_ROUTES = Object.keys(ROWS);

export function screenFor(template: string): Screen {
  return (ROWS[template] ?? OTHER).screen;
}

export function fromScreenFor(template: string): Row['fromScreen'] {
  return (ROWS[template] ?? OTHER).fromScreen;
}

const LANDING: Partial<Record<string, (typeof LANDING_PAGE_CODE)[keyof typeof LANDING_PAGE_CODE]>> = {
  '/home': LANDING_PAGE_CODE.home,
  '/@[handle]/[slug]': LANDING_PAGE_CODE.quest_page,
  '/@[handle]/blog/[slug]': LANDING_PAGE_CODE.blog_page,
  '/@[handle]': LANDING_PAGE_CODE.profile,
  '/explore': LANDING_PAGE_CODE.explore,
  '/quests': LANDING_PAGE_CODE.quests,
  '/create': LANDING_PAGE_CODE.create,
};

/** app_opened.landing_page, or undefined for pages outside the sheet's 0–6 (sent without it, §14). */
export function landingPageFor(template: string) {
  return LANDING[template];
}

export function isScreen(value: unknown): value is Screen {
  return typeof value === 'string' && (SCREENS as readonly string[]).includes(value);
}

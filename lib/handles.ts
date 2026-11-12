import { z } from 'zod';

export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;

// Words that would be confusing or unsafe as a profile URL (docs/03 §B.2), including every
// top-level route. Mirrored in the database by public.is_reserved_handle() (migration 8): keep both in step.
const RESERVED_HANDLES = new Set([
  'about',
  'admin',
  'api',
  'app',
  'auth',
  'demo',
  'email',
  'explore',
  'guides',
  'help',
  'home',
  'ingest',
  'login',
  'new',
  'notifications',
  'onboarding',
  'onquest',
  'people',
  'privacy',
  'quests',
  'settings',
  'support',
  'terms',
  'trips',
  'u',
  'welcome',
  'www',
]);

export const HandleSchema = z.string().trim().toLowerCase().regex(HANDLE_PATTERN);

export const isReservedHandle = (handle: string) => RESERVED_HANDLES.has(handle);

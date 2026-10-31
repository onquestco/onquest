import { z } from 'zod';

export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;

// Words that would be confusing or unsafe as a profile URL (docs/03 §B.2).
const RESERVED_HANDLES = new Set([
  'about',
  'admin',
  'api',
  'app',
  'auth',
  'demo',
  'help',
  'login',
  'new',
  'onboarding',
  'onquest',
  'privacy',
  'settings',
  'support',
  'terms',
  'trips',
  'u',
  'www',
]);

export const HandleSchema = z.string().trim().toLowerCase().regex(HANDLE_PATTERN);

export const isReservedHandle = (handle: string) => RESERVED_HANDLES.has(handle);

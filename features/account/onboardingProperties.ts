import { USERNAME_FORM_CODE, USERNAME_REJECTED_REASON_CODE, WELCOME_ACTION_CODE } from '@/lib/analytics/codes';
import type { EventProps } from '@/lib/analytics/taxonomy';
import { HandleSchema, isReservedHandle } from '@/lib/handles';

// Properties of the username and welcome events (analytics v2, events.csv section 1). The
// username itself is never sent, only its length (events.csv username_set comment).

export type UsernameRejection = keyof typeof USERNAME_REJECTED_REASON_CODE;
export type UsernameForm = keyof typeof USERNAME_FORM_CODE;

/** username_set: a username saved for the first time (onboarding) or changed (Edit profile). */
export function usernameSetProperties(
  handle: string,
  firstTime: boolean,
  rejectedAttempts: number | undefined,
): EventProps<'username_set'> {
  const properties = {
    first_time_flg: firstTime,
    username_length: handle.length,
    // A tab still on the old bundle doesn't send the count: left out, not guessed (still sent, §4.2).
    rejected_attempts: rejectedAttempts,
  };
  return properties as EventProps<'username_set'>;
}

/** username_rejected: the username field shows a refusal. */
export function usernameRejectedProperties(
  reason: UsernameRejection,
  form: UsernameForm,
): EventProps<'username_rejected'> {
  return { reason: USERNAME_REJECTED_REASON_CODE[reason], source: USERNAME_FORM_CODE[form] };
}

/**
 * Why Edit profile's username field refuses `handle`, or undefined when it doesn't: the format
 * rule, a reserved word (checkHandle answers "not available" for those), or taken.
 */
export function usernameRejection(handle: string, available: boolean | null): UsernameRejection | undefined {
  if (!HandleSchema.safeParse(handle).success) return 'invalid';
  if (isReservedHandle(handle)) return 'reserved';
  return available === false ? 'taken' : undefined;
}

/** welcome_step_viewed: welcome screen `index` (0-based) shows; the sheet counts from 1. */
export function welcomeStepViewedProperties(index: number): EventProps<'welcome_step_viewed'> {
  return { step: welcomeStep(index) };
}

/** welcome_click: Skip, Next or Get started on welcome screen `index` (0-based). */
export function welcomeClickProperties(
  action: keyof typeof WELCOME_ACTION_CODE,
  index: number,
): EventProps<'welcome_click'> {
  return { action: WELCOME_ACTION_CODE[action], step: welcomeStep(index) };
}

function welcomeStep(index: number): 1 | 2 | 3 {
  if (index <= 0) return 1;
  return index === 1 ? 2 : 3;
}

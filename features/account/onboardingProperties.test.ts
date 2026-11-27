import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WELCOME_STEPS } from '@/features/home/welcomeSteps';
import { readEventRows } from '@/lib/analytics/taxonomyFromCsv';
import { expectNoProblems, validateEvent } from '@/lib/analytics/validate';
import {
  usernameRejectedProperties,
  usernameRejection,
  usernameSetProperties,
  welcomeClickProperties,
  welcomeStepViewedProperties,
} from './onboardingProperties';

// username_set, username_rejected, welcome_step_viewed and welcome_click: codes and counts only,
// never the username itself.

describe('username_set', () => {
  it('sends the length and the refusals, not the username', () => {
    const properties = usernameSetProperties('riya_travels', true, 2);
    expectNoProblems('username_set', properties);
    expect(properties).toEqual({ first_time_flg: true, username_length: 12, rejected_attempts: 2 });
    expect(JSON.stringify(properties)).not.toContain('riya');
  });

  it('is false for a change from Edit profile', () => {
    const properties = usernameSetProperties('riya', false, 0);
    expectNoProblems('username_set', properties);
    expect(properties.first_time_flg).toBe(false);
  });

  it('leaves rejected_attempts out for an old bundle; the event is still valid otherwise', () => {
    const properties = usernameSetProperties('riya', true, undefined);
    expect(properties.rejected_attempts).toBeUndefined();
    const { problems } = validateEvent('username_set', properties);
    expect(problems).toEqual(['rejected_attempts: missing']);
  });
});

describe('username_rejected', () => {
  it.each([
    ['taken', 'onboarding', { reason: 0, source: 0 }],
    ['invalid', 'onboarding', { reason: 1, source: 0 }],
    ['reserved', 'edit_profile', { reason: 2, source: 1 }],
  ] as const)('%s on %s', (reason, form, expected) => {
    const properties = usernameRejectedProperties(reason, form);
    expectNoProblems('username_rejected', properties);
    expect(properties).toEqual(expected);
  });

  it('gives Edit profile’s reason for what the field shows', () => {
    expect(usernameRejection('ab', null)).toBe('invalid');
    expect(usernameRejection('has space', true)).toBe('invalid');
    expect(usernameRejection('settings', false)).toBe('reserved');
    expect(usernameRejection('riya', false)).toBe('taken');
    expect(usernameRejection('riya', null)).toBeUndefined();
    expect(usernameRejection('riya', true)).toBeUndefined();
  });
});

describe('welcome', () => {
  it('numbers the steps from 1, as the sheet does, in the screens’ order', () => {
    const row = readEventRows(readFileSync(join(process.cwd(), 'docs', 'analytics', 'v2', 'events.csv'), 'utf8')).find(
      (candidate) => candidate.event === 'welcome_step_viewed' && candidate.property === 'step',
    );
    WELCOME_STEPS.forEach((step, index) => {
      const properties = welcomeStepViewedProperties(index);
      expectNoProblems('welcome_step_viewed', properties);
      expect(row?.description).toContain(`${properties.step} = '${step.headline}'`);
    });
  });

  it.each([
    ['skip', 0, { action: 0, step: 1 }],
    ['next', 1, { action: 1, step: 2 }],
    ['get_started', 2, { action: 2, step: 3 }],
  ] as const)('welcome_click %s on step index %i', (action, index, expected) => {
    const properties = welcomeClickProperties(action, index);
    expectNoProblems('welcome_click', properties);
    expect(properties).toEqual(expected);
  });
});

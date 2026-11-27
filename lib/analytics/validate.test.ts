import { describe, expect, it } from 'vitest';
import { CLIENT_EVENTS } from './taxonomy';
import { expectNoProblems, keepAllowed, propertyProblems, validateEvent, validateProperties } from './validate';

describe('propertyProblems', () => {
  const rules = CLIENT_EVENTS.photos_picked;

  it('accepts a valid event', () => {
    const valid = { quest_id: 'k', count: 5, with_dates: 5, with_location: 2, no_metadata: 0 };
    expect(propertyProblems(rules, valid)).toEqual([]);
  });

  it('refuses unknown properties, out-of-range numbers and missing required ones', () => {
    const problems = propertyProblems(rules, { quest_id: 'k', count: 99, title: 'Goa' });
    expect(problems).toContain('title: not in the taxonomy');
    expect(problems).toContain('count: 99 outside 3–15');
    expect(problems).toContain('with_dates: missing');
  });

  it('refuses a value not in the allowed list', () => {
    const app = { entry: 'tiktok', referrer: 'none', signed_in: false };
    expect(propertyProblems(CLIENT_EVENTS.app_opened, app)).toEqual(['entry: "tiktok" not allowed']);
  });
});

describe('keepAllowed', () => {
  it('drops anything not in the event, and undefined values', () => {
    const kept = keepAllowed(CLIENT_EVENTS.app_opened, { entry: 'direct', url: 'x', referrer: undefined });
    expect(kept).toEqual({ entry: 'direct' });
  });
});

describe('validateEvent (v2)', () => {
  const key = { type: 'STRING', required: true, pattern: 'key' } as const;

  it('keeps a valid event as it is', () => {
    const properties = { content_type: 0, content_id: 'k3f9x2' };
    expect(validateEvent('report_click', properties)).toEqual({ properties, problems: [] });
  });

  it('still sends an event with a missing required property, and says which', () => {
    const { properties, problems } = validateEvent('quest_viewed', { quest_id: 'k3f9x2', is_owner_flg: false });
    expect(properties).toEqual({ quest_id: 'k3f9x2', is_owner_flg: false });
    expect(problems).toContain('owner_user_id: missing');
  });

  it('removes unknown properties and bad values, and never reports a value', () => {
    const { properties, problems } = validateEvent('report_click', {
      content_type: 7,
      content_id: 'k3f9x2',
      title: 'Monsoon in Goa',
    });
    expect(properties).toEqual({ content_id: 'k3f9x2' });
    expect(problems).toEqual(['content_type: not an allowed value', 'title: not in the taxonomy']);
    expect(problems.join()).not.toContain('Monsoon');
  });

  it('removes a key with a space, an @ or a link', () => {
    for (const bad of ['two words', 'riya@onquest', 'http://example.com', 'x'.repeat(65), '']) {
      expect(validateProperties({ quest_id: key }, { quest_id: bad }).properties).toEqual({});
    }
    expect(validateProperties({ quest_id: key }, { quest_id: 'Goa_trip-K3F9' }).problems).toEqual([]);
  });

  it('removes an email-shaped value from any property, even an allowed-values one', () => {
    const email = 'riya@example.com';
    const method = validateEvent('sign_in_click', { method: email, source: 0, client_ts: '2026-11-26T10:00:00Z' });
    expect(method.properties).toEqual({ source: 0, client_ts: '2026-11-26T10:00:00Z' });
    expect(method.problems).toContain('method: looks like an email');
    const town = validateProperties({ chip_name: { type: 'STRING', required: false, pattern: 'town' } }, {
      chip_name: email,
    });
    expect(town.properties).toEqual({});
    expect([...method.problems, ...town.problems].join()).not.toContain('riya');
  });

  it('accepts towns with accents and apostrophes only', () => {
    const rules = { chip_name: { type: 'STRING', required: false, pattern: 'town' } } as const;
    for (const town of ['Goa', 'São Paulo', "Coeur d'Alene", 'Leh-Ladakh']) {
      expect(validateProperties(rules, { chip_name: town }).problems).toEqual([]);
    }
    for (const text of ['Goa!', 'beach 2026', 'a'.repeat(61)]) {
      expect(validateProperties(rules, { chip_name: text }).properties).toEqual({});
    }
  });

  it('lowercases utm_source and sends anything else as other', () => {
    const utm = (value: string) => validateEvent('app_opened', { utm_source: value }).properties.utm_source;
    expect(utm('WhatsApp')).toBe('whatsapp');
    expect(utm('ig.story_1')).toBe('ig.story_1');
    expect(utm('summer sale!')).toBe('other');
    expect(utm('x'.repeat(41))).toBe('other');
  });

  it('checks numbers, ranges, booleans and timestamps', () => {
    const check = (event: string, properties: object) => validateEvent(event, properties).problems;
    expect(check('quest_page_turn', { page_no: 1.5 })).toContain('page_no: not a whole number');
    expect(check('quest_page_turn', { page_no: 9 })).toContain('page_no: above the maximum');
    expect(check('feed_load_more_click', { page_no: 1 })).toContain('page_no: below the minimum');
    expect(check('feed_load_more_click', { page_no: 40 })).toEqual([]);
    expect(check('quest_page_turn', { looped_flg: 'true' })).toContain('looped_flg: not a boolean');
    expect(check('quest_creation_complete', { minutes_since_start: Number.NaN })).toContain(
      'minutes_since_start: not a number',
    );
    const timestamp = (value: string) => check('sign_in_click', { method: 'google', source: 0, client_ts: value });
    expect(timestamp('2026-11-26T10:00:00.123Z')).toEqual([]);
    expect(timestamp('2026-11-26T15:30:00+05:30')).toEqual([]);
    expect(timestamp('2026-11-26T10:00:00')).toEqual(['client_ts: not an ISO timestamp with an offset']);
    expect(timestamp('26 Nov 2026')).toEqual(['client_ts: not an ISO timestamp with an offset']);
  });

  it('checks comma lists against their codes', () => {
    const changes = (value: string) => validateEvent('quest_updated', { change_types: value }).properties;
    expect(changes('1,4')).toEqual({ change_types: '1,4' });
    expect(changes('1,12')).toEqual({});
    const fields = (value: string) => validateEvent('profile_updated', { fields_changed: value }).properties;
    expect(fields('name,bio')).toEqual({ fields_changed: 'name,bio' });
    expect(fields('name,email')).toEqual({});
  });

  it('keeps an explicit null on an optional property, and ignores undefined', () => {
    const { properties, problems } = validateEvent('photo_limit_hit', { quest_id: null, limit: 0, screen: undefined });
    expect(properties).toEqual({ quest_id: null, limit: 0 });
    expect(problems).toEqual(['screen: missing']);
  });

  it('keeps no properties for an unknown event name', () => {
    expect(validateEvent('blog_managed', { blog_id: 'k3f9x2' })).toEqual({
      properties: {},
      problems: ['event: not in the taxonomy'],
    });
  });
});

describe('expectNoProblems', () => {
  it('passes a builder’s valid output', () => {
    expect(() => expectNoProblems('report_click', { content_type: 0, content_id: 'k3f9x2' })).not.toThrow();
  });

  it('throws with property names only', () => {
    expect(() => expectNoProblems('report_click', { content_type: 0, content_id: 'two words' })).toThrow(
      'report_click: content_id: not a valid key',
    );
  });
});

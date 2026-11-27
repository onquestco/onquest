import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { OPTIONAL_OVERRIDES, parseCsv, readEventRows, type EventRule, type PropertyRule } from './taxonomyFromCsv';
import { COMMON_PROPERTIES, EVENTS } from './taxonomyV2';

// The taxonomy check (docs/specs/analytics-v2.md §11), v2 part. AN-02 adds the call-site checks
// (every name passed to track/trackServer is in the taxonomy; no v1 name left in code) when it
// switches the app to v2.

const csv = (name: string) => readFileSync(join(process.cwd(), 'docs', 'analytics', 'v2', `${name}.csv`), 'utf8');
const events: Record<string, EventRule> = EVENTS;
const properties = Object.entries(events).flatMap(([event, rule]) =>
  Object.entries(rule.properties).map(([property, propertyRule]: [string, PropertyRule]) => ({
    event,
    property,
    rule: propertyRule,
  })),
);

describe('v2 taxonomy rules', () => {
  it('allows no free text: every STRING has allowed values, a code list or a pattern', () => {
    const free = properties.filter(
      ({ rule }) => rule.type === 'STRING' && !rule.values && !rule.list && !rule.pattern,
    );
    expect(free).toEqual([]);
  });

  it('uses the key pattern for ids only', () => {
    const keys = properties.filter(({ rule }) => rule.pattern === 'key').map(({ property }) => property);
    expect(keys.filter((property) => !property.endsWith('_id'))).toEqual([]);
  });

  it('makes every _flg property a BOOL', () => {
    const wrong = properties.filter(({ property, rule }) => property.endsWith('_flg') && rule.type !== 'BOOL');
    expect(wrong).toEqual([]);
  });

  it('cites only code lists that exist in codes.csv, with the same codes', () => {
    const [, ...codeRows] = parseCsv(csv('codes'));
    const codesOf = (list: string) =>
      codeRows.filter(([name]) => name?.trim() === list).map(([, code]) => Number(code));
    const cited = readEventRows(csv('events')).flatMap((row) => {
      const match = /^Codes: ([a-z_]+)/.exec(row.description);
      return match?.[1] ? [{ row, list: match[1] }] : [];
    });
    expect(cited.length).toBeGreaterThan(0);
    for (const { row, list } of cited) {
      const rule = events[row.event]?.properties[row.property];
      const codes = codesOf(list);
      expect(codes.length).toBeGreaterThan(0);
      expect([rule?.min, rule?.max]).toEqual([Math.min(...codes), Math.max(...codes)]);
    }
  });

  it('counts only with server events (spec §10)', () => {
    const counted = [
      'user_signed_up',
      'user_signed_in',
      'quest_creation_complete',
      'quest_updated',
      'quest_draft_created',
      'content_liked',
      'comment_posted',
      'comment_deleted',
      'user_followed',
      'content_deleted',
      'visibility_changed',
      'comments_toggled',
      'account_deleted',
      'notification_sent',
      'blog_draft_saved',
      'blog_published',
      'blog_updated',
    ];
    expect(counted.filter((name) => events[name]?.type !== 'server')).toEqual([]);
  });

  it('keeps every optional override live, and names the task for each temporary one', () => {
    const exists = (name: string) =>
      name.includes('.')
        ? properties.some(({ event, property }) => `${event}.${property}` === name)
        : properties.some(({ property }) => property === name);
    expect(Object.keys(OPTIONAL_OVERRIDES).filter((name) => !exists(name))).toEqual([]);
    for (const override of Object.values(OPTIONAL_OVERRIDES)) {
      if (override.kind === 'temporary') expect(override.filledBy).toMatch(/^AN-(0[2-9]|1[0-4])$/);
    }
  });

  it('marks no internal accounts and carries no email or username outside user_info', () => {
    const personal = ['is_internal_flg', 'user_info', 'email', 'email_id', 'username', 'handle'];
    const common: readonly string[] = COMMON_PROPERTIES;
    expect(common.filter((name) => personal.includes(name) && name !== 'user_info')).toEqual([]);
    expect(properties.filter(({ property }) => personal.includes(property))).toEqual([]);
  });
});

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { V1_RENAMES } from './renameMap';
import { COMMON_PROPERTIES, EVENTS } from './taxonomy';
import { OPTIONAL_OVERRIDES, parseCsv, readEventRows, type EventRule, type PropertyRule } from './taxonomyFromCsv';
import { CLIENT_EVENTS, SERVER_EVENTS } from './taxonomyV1';

// The taxonomy check (docs/specs/analytics-v2.md §11): the v2 rules, and the call sites.

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

/** Every .ts/.tsx source file (not tests) under these folders, as [repo-relative path, text]. */
function sources(...folders: string[]): [string, string][] {
  const root = process.cwd();
  const walk = (folder: string): string[] =>
    readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) return walk(path);
      return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
    });
  return folders
    .flatMap((folder) => walk(join(root, folder)))
    .map((path): [string, string] => [relative(root, path), readFileSync(path, 'utf8')]);
}

describe('call sites (AN-02)', () => {
  const code = sources('app', 'features', 'lib');

  it('sends only v2 names, each with its own sender', () => {
    const calls = code.flatMap(([path, text]) =>
      [...text.matchAll(/\b(track|trackServer)\(\s*['"`]([^'"`]+)['"`]/g)].map(([, sender, name]) => ({
        path,
        sender,
        name,
      })),
    );
    expect(calls.length).toBeGreaterThan(0);
    const wrong = calls.filter(({ sender, name }) => {
      const type = name ? events[name]?.type : undefined;
      if (!type) return true;
      return sender === 'trackServer' ? type !== 'server' : type === 'server';
    });
    expect(wrong).toEqual([]);
  });

  it('leaves no v1-only event name in code, outside the frozen v1 files', () => {
    const v1Names = [...Object.keys(CLIENT_EVENTS), ...Object.keys(SERVER_EVENTS)];
    const v1Only = v1Names.filter((name) => !events[name]);
    // The renamed live events are among them (blog_viewed etc. kept their names).
    expect(v1Only).toEqual(expect.arrayContaining(Object.keys(V1_RENAMES).filter((name) => !events[name])));
    const allowed = [
      'lib/analytics/taxonomyV1.ts',
      'lib/analytics/renameMap.ts',
      'lib/analytics/ingestEnrich.ts',
    ];
    const found = code
      .filter(([path]) => !allowed.includes(path.split('\\').join('/')))
      .flatMap(([path, text]) =>
        v1Only.filter((name) => new RegExp(`['"\`]${name}['"\`]`).test(text)).map((name) => ({ path, name })),
      );
    expect(found).toEqual([]);
  });
});

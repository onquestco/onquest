import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLIENT_EVENTS, SERVER_EVENTS } from './taxonomy';
import { parseCsv, renderTaxonomyModule, taxonomyFromCsv } from './taxonomyFromCsv';

const csv = (name: string) => readFileSync(join(process.cwd(), 'docs', 'analytics', `${name}.csv`), 'utf8');

describe('taxonomy.ts', () => {
  it('matches the CSV export (run npm run analytics after re-exporting the sheet)', () => {
    const expected = renderTaxonomyModule(
      taxonomyFromCsv(csv('client-events')),
      taxonomyFromCsv(csv('server-events')),
    );
    expect(readFileSync(join(process.cwd(), 'lib', 'analytics', 'taxonomy.ts'), 'utf8')).toBe(expected);
  });

  it('reads enums, ranges, comma lists and events with common properties only', () => {
    expect(CLIENT_EVENTS.app_opened.entry).toEqual({
      type: 'STRING',
      required: true,
      values: ['direct', 'shared_link', 'email', 'notification'],
    });
    expect(CLIENT_EVENTS.photos_picked.count).toMatchObject({ type: 'INT64', min: 3, max: 15 });
    expect(SERVER_EVENTS.profile_updated.fields).toMatchObject({
      list: ['name', 'username', 'photo', 'city', 'bio'],
    });
    expect(CLIENT_EVENTS.settings_viewed).toEqual({});
  });
});

describe('parseCsv', () => {
  it('handles quotes, commas in quotes and escaped quotes', () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\n')).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['1', '2', '3'],
    ]);
  });
});

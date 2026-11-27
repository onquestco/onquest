import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCRATCH_DATASET, VIEW_FILES, renderApplyG1, renderFixtureCheck } from './bigqueryG1';
import { parseCsv, type EventRule } from './taxonomyFromCsv';
import { COMMON_PROPERTIES, EVENTS } from './taxonomy';

// The Metrics tab's BigQuery queries (docs/analytics/v2/metrics.csv) must stay valid against the
// v2 taxonomy and the events_clean view (spec AC14). The CTO's dry run at G1 checks the SQL itself.

const events: Record<string, EventRule> = EVENTS;
const read = (...path: string[]) => readFileSync(join(process.cwd(), ...path), 'utf8');
const bigquery = (name: string) => read('docs', 'analytics', 'bigquery', name);
const withoutComments = (sql: string) => sql.replace(/--.*$/gm, '');

/** The view's columns (spec §5.3) plus person_id (DAU note). events_people adds user_info. */
const COLUMNS = [
  'event_id',
  'name',
  'type',
  'env',
  'ts',
  'client_ts',
  'user_id',
  'anon_id',
  'session_id',
  'platform',
  'os',
  'browser',
  'screen',
  'country',
  'app_version',
  'properties',
  'person_id',
];
/** The only PostHog `$` keys a view may pass on: route templates on $pageview (review round 1). */
const ALLOWED_DOLLAR_KEYS = ['$current_url', '$pathname'];
/** Export columns with IPs or PostHog person and location data (CTO, G1). */
const FORBIDDEN_COLUMNS = ['ip', 'set', 'set_once', 'person_properties', 'elements'];

const metrics = (() => {
  const [header = [], ...rows] = parseCsv(read('docs', 'analytics', 'v2', 'metrics.csv'));
  const metricAt = header.indexOf('Metric');
  const sqlAt = header.indexOf('BigQuery SQL');
  return rows.map((cells) => ({ metric: cells[metricAt] ?? '', sql: cells[sqlAt] ?? '' }));
})();

function eventNames(sql: string): string[] {
  const single = [...sql.matchAll(/\bname\s*=\s*'([^']+)'/g)].map((match) => match[1] ?? '');
  const lists = [...sql.matchAll(/\bname\s+IN\s*\(([^)]*)\)/g)].flatMap((match) =>
    [...(match[1] ?? '').matchAll(/'([^']+)'/g)].map((quoted) => quoted[1] ?? ''),
  );
  return [...new Set([...single, ...lists])];
}

describe('Metrics queries (metrics.csv)', () => {
  it('has a query for every metric', () => {
    expect(metrics.length).toBe(18);
    expect(metrics.filter(({ sql }) => !sql.includes('SELECT'))).toEqual([]);
  });

  it('read only events_clean', () => {
    for (const { metric, sql } of metrics) {
      const tables = [...sql.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
      expect({ metric, tables: [...new Set(tables)] }).toEqual({ metric, tables: ['onquest_analytics.events_clean'] });
    }
  });

  it('name only v2 events', () => {
    const unknown = metrics.flatMap(({ sql }) => eventNames(sql)).filter((name) => !events[name]);
    expect(unknown).toEqual([]);
  });

  it('read only properties of the events they name, or columns of events_clean', () => {
    for (const { metric, sql } of metrics) {
      const named = eventNames(sql);
      const candidates = named.length > 0 ? named : Object.keys(events);
      const missing = [...sql.matchAll(/'\$\.([a-z0-9_]+)'/g)]
        .map((match) => match[1] ?? '')
        .filter((property) => !COLUMNS.includes(property))
        .filter((property) => !candidates.some((name) => events[name]?.properties[property]));
      expect({ metric, missing }).toEqual({ metric, missing: [] });
    }
  });
});

describe('BigQuery views (docs/analytics/bigquery)', () => {
  const people = bigquery('events_people_all.sql');

  it('output the columns the Metrics queries use, and user_info only in the people views', () => {
    const output = people.slice(people.lastIndexOf('\nSELECT\n'), people.lastIndexOf('FROM filled'));
    for (const column of [...COLUMNS, 'user_info']) expect(output).toMatch(new RegExp(`\\b${column},?\\n`));
    expect(bigquery('events_clean_all.sql')).toContain('SELECT * EXCEPT (user_info)');
    expect(bigquery('events_clean.sql')).toContain('FROM `onquest_analytics.events_clean_all`');
    for (const view of ['events_clean.sql', 'events_people.sql']) {
      expect(bigquery(view)).toContain("WHERE env = 'production'");
    }
  });

  it('give every v2 event its taxonomy type when a row has none', () => {
    const typeList = (type: string) => {
      const match = new RegExp(`WHEN name IN \\(([^)]*)\\) THEN '${type}'`).exec(people);
      return [...(match?.[1] ?? '').matchAll(/'([^']+)'/g)].map((quoted) => quoted[1]).sort();
    };
    for (const type of ['click', 'view', 'client', 'server']) {
      const expected = Object.keys(events).filter((name) => events[name]?.type === type).sort();
      expect({ type, names: typeList(type) }).toEqual({ type, names: expected });
    }
  });

  it('never select ip, set, set_once, person_properties or elements from the export', () => {
    for (const file of VIEW_FILES) {
      const sql = withoutComments(bigquery(file)).replace(/'[^']*'/g, "''");
      const used = FORBIDDEN_COLUMNS.filter((column) => new RegExp(`\\b${column}\\b`).test(sql));
      expect({ file, used }).toEqual({ file, used: [] });
    }
  });

  it('rebuild properties from an allowlist: the taxonomy keys, the common ones and two $ keys', () => {
    const block = people.slice(people.indexOf('allowlist:start'), people.indexOf('allowlist:end'));
    const pairs = [...block.matchAll(/'([^']+)', JSON_QUERY\(props, '\$\.(?:"([^"]+)"|([a-z0-9_]+))'\)/g)];
    for (const [, key, quoted, plain] of pairs) expect(quoted ?? plain).toBe(key);
    const expected = new Set<string>(ALLOWED_DOLLAR_KEYS);
    for (const name of COMMON_PROPERTIES) if (name !== 'user_info') expected.add(name);
    for (const rule of Object.values(events)) for (const name of Object.keys(rule.properties)) expected.add(name);
    const keys = pairs.map(([, key]) => key ?? '');
    expect(keys).toEqual([...expected].sort());
    expect(keys.filter((key) => key.startsWith('$'))).toEqual(ALLOWED_DOLLAR_KEYS);
    expect(keys).not.toContain('user_info');
  });

  it('keep the paste-ready G1 files up to date (run npm run analytics)', () => {
    expect(bigquery('g1_fixture_check.sql')).toBe(renderFixtureCheck(bigquery));
    expect(bigquery('apply-g1.sql')).toBe(renderApplyG1(bigquery));
  });

  it('run the fixture check on the scratch dataset only, with the real view SQL', () => {
    const fixture = bigquery('g1_fixture_check.sql');
    expect(fixture).not.toMatch(/`onquest_analytics\./);
    expect(fixture).toContain(people.replaceAll('`onquest_analytics.', `\`${SCRATCH_DATASET}.`));
    expect(fixture).toContain(`DROP SCHEMA \`${SCRATCH_DATASET}\` CASCADE;`);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HandleSchema, isReservedHandle } from './handles';

describe('HandleSchema', () => {
  it('lowercases and trims', () => {
    expect(HandleSchema.parse('  Swati_01 ')).toBe('swati_01');
  });

  it.each(['ab', 'a'.repeat(21), 'has space', 'dash-ed', 'émile', ''])('rejects %j', (handle) => {
    expect(HandleSchema.safeParse(handle).success).toBe(false);
  });
});

describe('isReservedHandle', () => {
  it('blocks route names and the product name', () => {
    expect(isReservedHandle('login')).toBe(true);
    expect(isReservedHandle('onquest')).toBe(true);
  });

  it.each([
    'home',
    'explore',
    'quests',
    'notifications',
    'welcome',
    'guides',
    'email',
    'ingest',
    'people',
    'api',
  ])('blocks the new top-level route %s', (handle) => {
    expect(isReservedHandle(handle)).toBe(true);
  });

  it('matches the database list in migration 8', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/20261110100000_08_profiles_keys.sql'),
      'utf8',
    );
    const list = sql.match(/is_reserved_handle[\s\S]*?array\[([\s\S]*?)\]/)?.[1] ?? '';
    const words = [...list.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]);
    expect(words.length).toBeGreaterThan(20);
    for (const word of words) expect(isReservedHandle(word!)).toBe(true);
  });

  it('allows normal handles', () => {
    expect(isReservedHandle('swati')).toBe(false);
  });
});

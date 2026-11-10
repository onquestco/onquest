import { beforeAll, describe, expect, it } from 'vitest';
import { createSocialDatabase, GOA } from './socialHelpers';

// Search (spec C §3.5): public published Quests and people; never unlisted, private or drafts.

let db: Awaited<ReturnType<typeof createSocialDatabase>>;
type Results = { quests: { key: string }[]; people: { handle: string }[] };
const search = (text: string) =>
  db.one<Results>(undefined, 'select public.search_public($1, 10) as result', [text]);

beforeAll(async () => {
  db = await createSocialDatabase();
}, 30_000);

describe('search_public', () => {
  it('finds public Quests by title and place', async () => {
    expect((await search('palolem')).quests.map((quest) => quest.key)).toEqual([GOA]);
    expect((await search('Salt in the')).quests.map((quest) => quest.key)).toEqual([GOA]);
  });

  it('never finds unlisted or private Quests', async () => {
    expect((await search('gokarna')).quests).toEqual([]); // unlisted
    expect((await search('just for me')).quests).toEqual([]); // private
  });

  it('finds people by handle, name and city', async () => {
    expect((await search('alex')).people.map((person) => person.handle)).toContain('alex');
    expect((await search('bengaluru')).people.map((person) => person.handle)).toEqual(['alex']);
    expect((await search('riya')).people.map((person) => person.handle)).toEqual(['riya']);
  });

  it('treats % and _ as letters', async () => {
    expect(await search('%%')).toEqual({ quests: [], people: [] });
  });

  it('refuses text shorter than 2 or longer than 60 characters', async () => {
    await expect(search('a')).rejects.toThrow(/2 to 60/);
    await expect(search('x'.repeat(61))).rejects.toThrow(/2 to 60/);
  });
});

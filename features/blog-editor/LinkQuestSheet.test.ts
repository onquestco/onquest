import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { QuestCard } from '@/lib/trip/cards';
import type { Visibility } from '@/lib/trip/schema';
import { LinkQuestSheet } from './LinkQuestSheet';

const quest = (title: string, visibility: Visibility, n: number): QuestCard => ({
  key: `00000000-0000-4000-8000-00000000000${n}`,
  title,
  status: 'published',
  visibility,
  path: `/@riya/quest-${n}`,
  coverThumb: `https://photos.example/${n}/thumb.webp`,
  pageCount: 3,
  photoCount: 12,
  places: ['Goa'],
  likeCount: 0,
  commentCount: 0,
  savedAt: '2026-11-20 10:00:00+00',
  owner: { key: '00000000-0000-4000-8000-000000000009', handle: 'riya', name: 'Riya' },
});

const noop = () => undefined;
const render = (quests: QuestCard[], linkedKey?: string) =>
  renderToStaticMarkup(
    createElement(LinkQuestSheet, { open: true, quests, linkedKey, onChoose: noop, onCreateQuest: noop, onClose: noop }),
  );

describe('LinkQuestSheet', () => {
  it('with no published Quests: the empty message and Create a Quest', () => {
    const html = render([]);
    expect(html).toContain('Link a Quest');
    expect(html).toContain('Readers see it at the end of your blog.');
    expect(html).toContain('You haven&#x27;t published a Quest yet.');
    expect(html).toContain('Create a Quest');
    expect(html).not.toContain('type="radio"');
  });

  it('lists Quests with their tag; unlisted and private ones say who sees them', () => {
    const html = render([
      quest('3 days in Goa', 'public', 1),
      quest('Hampi weekend', 'unlisted', 2),
      quest('Family trip', 'private', 3),
    ]);
    expect(html).toContain('3 days in Goa');
    expect(html).toContain('Shown only on unlisted blogs');
    expect(html).toContain('Only you can see this one');
    expect(html.match(/type="radio"/g)).toHaveLength(3);
  });

  it('marks the linked Quest as chosen', () => {
    const goa = quest('3 days in Goa', 'public', 1);
    const html = render([goa, quest('Hampi weekend', 'public', 2)], goa.key);
    expect(html.match(/checked=""/g)).toHaveLength(1);
    const chosenInput = html.match(new RegExp(`<input[^>]*value="${goa.key}"[^>]*>`))?.[0] ?? '';
    expect(chosenInput).toContain('checked=""');
  });
});

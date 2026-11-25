import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { QuestDocument } from '@/lib/trip/schema';
import { ChooseTemplate, templateChoices } from './ChooseTemplate';

// vi.mock is hoisted above the imports. Rendered outside Next.js: a plain router, a plain <a> and
// stand-in fonts for next/navigation, next/link and next/font.
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: () => undefined, push: () => undefined }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) =>
    createElement('a', { href, className }, children),
}));
vi.mock('next/font/google', () => import('@/templates/shared/nextFontStub'));
// Server rendering reads a zustand store's initial state, so the draft is handed in directly.
const draft = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('./draftStore', () => ({ useDraft: () => draft.current }));

const KEY = '00000000-0000-4000-8000-000000000001';
const document = (templateId: string): QuestDocument =>
  ({ templateId, content: { favourites: [], days: [] }, photos: [], places: [] }) as unknown as QuestDocument;

/** The picker's choices as "Name" or "Name (selected)", in order. */
function choices(templateId: string, published = false) {
  draft.current = {
    key: KEY,
    document: document(templateId),
    published: published ? { slug: 'goa', visibility: 'public', path: '/@alex/goa' } : undefined,
    setDocument: () => undefined,
  };
  const html = renderToStaticMarkup(createElement(ChooseTemplate, { tripKey: KEY }));
  return html
    .split('role="radio"')
    .slice(1)
    .map((radio) => {
      const name = radio.match(/<span class="flex justify-between[^"]*">([^<]+)/)?.[1] ?? '?';
      return radio.startsWith(' aria-checked="true"') ? `${name} (selected)` : name;
    });
}

describe('ChooseTemplate', () => {
  const LIVE = ['Coastal', 'Mountain', 'Roadtrip', 'Winter', 'Monsoon', 'Desert'];
  const selecting = (index: number) =>
    LIVE.map((name, i) => (i === index ? `${name} (selected)` : name));

  it('a new Quest is offered every live template, Coastal selected (AC1, AC4)', () => {
    expect(choices('coastal')).toEqual(selecting(0));
  });

  it('a draft that picked the new Mountain keeps it selected', () => {
    expect(choices('alpine')).toEqual(selecting(1));
  });

  it('a draft that picked Roadtrip keeps it selected', () => {
    expect(choices('roadtrip')).toEqual(selecting(2));
  });

  it('a draft that picked Winter keeps it selected', () => {
    expect(choices('winter')).toEqual(selecting(3));
  });

  it('a draft that picked Monsoon keeps it selected', () => {
    expect(choices('monsoon')).toEqual(selecting(4));
  });

  it('a draft that picked Desert keeps it selected', () => {
    expect(choices('desert')).toEqual(selecting(5));
  });

  it('a draft that chose Beach keeps it, selected, next to Coastal (AC2)', () => {
    expect(choices('beach')).toEqual([...LIVE, 'Beach (selected)']);
  });

  it('a draft that chose the old Mountain keeps it too, after the new one (AC2)', () => {
    expect(choices('mountain')).toEqual([...LIVE, 'Mountain (selected)']);
  });

  it('a published Quest only shows the look it has (spec D4)', () => {
    expect(choices('beach', true)).toEqual(['Beach (selected)']);
  });
});

describe('templateChoices', () => {
  it('never offers a retired template the Quest isn’t using', () => {
    expect(templateChoices('coastal', false).map((template) => template.id)).toEqual([
      'coastal',
      'alpine',
      'roadtrip',
      'winter',
      'monsoon',
      'desert',
    ]);
  });
});

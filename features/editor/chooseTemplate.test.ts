import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuestDocument } from '@/lib/trip/schema';
import { ChooseTemplate, templateChoices } from './ChooseTemplate';
import { useDraft } from './draftStore';

// vi.mock is hoisted above the imports. Rendered outside Next.js: a plain router, a plain <a> and
// stand-in fonts for next/navigation, next/link and next/font.
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: () => undefined, push: () => undefined }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) =>
    createElement('a', { href, className }, children),
}));
vi.mock('next/font/google', () => import('@/templates/shared/nextFontStub'));

const KEY = '00000000-0000-4000-8000-000000000001';
const document = (templateId: string): QuestDocument =>
  ({ templateId, content: { favourites: [], days: [] }, photos: [], places: [] }) as unknown as QuestDocument;

/** The picker's choices as "Name" or "Name (selected)", in order. */
function choices(templateId: string, published = false) {
  useDraft.setState({
    key: KEY,
    document: document(templateId),
    published: published ? { slug: 'goa', visibility: 'public', path: '/@alex/goa' } : undefined,
  });
  const html = renderToStaticMarkup(createElement(ChooseTemplate, { tripKey: KEY }));
  return html
    .split('role="radio"')
    .slice(1)
    .map((radio) => {
      const name = radio.match(/<span class="flex justify-between[^"]*">([^<]+)/)?.[1] ?? '?';
      return radio.startsWith(' aria-checked="true"') ? `${name} (selected)` : name;
    });
}

beforeEach(() => useDraft.setState({ key: undefined, document: undefined, published: undefined }));

describe('ChooseTemplate', () => {
  it('a new Quest is offered Coastal only, already selected (AC1, AC4)', () => {
    expect(choices('coastal')).toEqual(['Coastal (selected)']);
  });

  it('a draft that chose Beach keeps it, selected, next to Coastal (AC2)', () => {
    expect(choices('beach')).toEqual(['Coastal', 'Beach (selected)']);
  });

  it('a draft that chose the old Mountain keeps it too (AC2)', () => {
    expect(choices('mountain')).toEqual(['Coastal', 'Mountain (selected)']);
  });

  it('a published Quest only shows the look it has (spec D4)', () => {
    expect(choices('beach', true)).toEqual(['Beach (selected)']);
  });
});

describe('templateChoices', () => {
  it('never offers a retired template the Quest isn’t using', () => {
    expect(templateChoices('coastal', false).map((template) => template.id)).toEqual(['coastal']);
  });
});

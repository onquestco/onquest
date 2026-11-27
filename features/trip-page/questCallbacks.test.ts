import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { goaTrip } from '@/lib/demo/goaTrip';
import { templates } from '@/templates/registry';
import { MemorySheetCallbacks } from '@/templates/shared/MemorySheet';
import { QuestPlayerCallbacks } from '@/templates/shared/QuestPlayer';

vi.mock('next/font/google', () => import('@/templates/shared/nextFontStub'));

// The Quest page's analytics reach the template only through these optional callbacks (spec
// analytics-v2 §6.2). They must not change a single character of any template's markup, so
// published Quests look the same with and without them (the Beach and old-Mountain fingerprints
// in templateSnapshots.test.ts check the no-callback side).

describe('QuestPlayer and MemorySheet callbacks', () => {
  it.each(Object.keys(templates))('%s renders the same markup with them', (id) => {
    const template = templates[id as keyof typeof templates];
    const trip = { ...goaTrip, templateId: id };
    const page = () => createElement(template.TripPage, { trip });
    const withCallbacks = createElement(QuestPlayerCallbacks, {
      onPageChange: () => undefined,
      children: createElement(MemorySheetCallbacks, { onAction: () => undefined, children: page() }),
    });
    expect(renderToStaticMarkup(withCallbacks)).toBe(renderToStaticMarkup(page()));
  });
});

'use client';

import Link from 'next/link';
import { buttonClassName } from '@/design-system/components/Button';
import { TopBar } from '@/design-system/components/TopBar';
import { goaTrip } from '@/lib/demo/goaTrip';
import { templates } from '@/templates/registry';
import { useDraft } from './draftStore';
import { LostDraft } from './LostDraft';
import { ScaledFrame } from './ScaledFrame';

// The same sample trip in every template, as in the prototype: the choice is about the look, and
// the creator sees their own photos in it on the next screen, Preview (founder, 12 Nov).
const SAMPLE = { ...goaTrip, title: 'Three days in Goa' };
// Drawn at a phone's width, then scaled down to the card.
const COVER_WIDTH = 390;

/** Screen 6: each template shown as its own cover page, in its own colours, fonts and decorations. */
export function ChooseTemplate({ tripKey }: { tripKey: string }) {
  const { key, document, setDocument } = useDraft();
  if (key !== tripKey || !document) return <LostDraft />;
  const live = Object.values(templates).filter((template) => template.status === 'live');

  return (
    <>
      <TopBar title="Template" href={`/quests/${tripKey}/review`} fallback={`/quests/${tripKey}/review`} />
      <main className="mx-auto flex min-h-svh max-w-lg flex-col gap-4 bg-surface px-4 pt-4 pb-28">
        <h2 className="text-lead font-semibold text-ink">Pick a look for your Quest</h2>
        <div role="radiogroup" aria-label="Template" className="flex flex-col gap-4">
          {live.map((template) => {
            const selected = document.templateId === template.id;
            return (
              <button
                key={template.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setDocument({ ...document, templateId: template.id })}
                className={`flex flex-col gap-2 rounded-lg border-2 p-2 text-left ${
                  selected ? 'border-brand-strong bg-brand-wash' : 'border-line bg-surface'
                } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong`}
              >
                <span className="relative block aspect-16/9 overflow-hidden rounded-md bg-surface-page">
                  {/* The template's own Quest cover, shrunk and cropped like the prototype's mini covers. */}
                  <ScaledFrame width={COVER_WIDTH}>
                    <template.TripPage trip={{ ...SAMPLE, templateId: template.id }} />
                  </ScaledFrame>
                </span>
                <span className="flex justify-between px-2 pb-1 text-body font-semibold text-ink">
                  {template.name}
                  {selected && <span className="text-label text-brand-strong">✓ Selected</span>}
                </span>
              </button>
            );
          })}
        </div>
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface px-4 py-4">
          <div className="mx-auto max-w-lg">
            <Link href={`/quests/${tripKey}/preview`} className={buttonClassName({ block: true })}>
              Preview
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

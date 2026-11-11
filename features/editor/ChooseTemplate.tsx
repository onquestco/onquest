'use client';

import Link from 'next/link';
import { buttonClassName } from '@/design-system/components/Button';
import { TopBar } from '@/design-system/components/TopBar';
import { templates } from '@/templates/registry';
import { CAROUSEL_SIZE } from '@/templates/shared/ExportFrames';
import { useDraft } from './draftStore';
import type { Creator } from './getCreator';
import { LostDraft } from './LostDraft';
import { ScaledFrame } from './ScaledFrame';
import { usePreviewTrip } from './usePreviewTrip';

/**
 * Screen 6: each template shown as its own cover page, in its own colours, fonts and decorations,
 * made from the creator's photos and title (the prototype's mini covers), so the choice is about
 * the look.
 */
export function ChooseTemplate({ tripKey, creator }: { tripKey: string; creator: Creator }) {
  const { key, document, setDocument } = useDraft();
  const preview = usePreviewTrip(creator);
  if (key !== tripKey || !document || !preview) return <LostDraft />;
  const live = Object.values(templates).filter((template) => template.status === 'live');

  return (
    <>
      <TopBar title="Template" href={`/quests/${tripKey}/review`} fallback={`/quests/${tripKey}/review`} />
      <main className="mx-auto flex min-h-svh max-w-lg flex-col gap-4 bg-surface px-4 pt-4 pb-28">
        <h2 className="text-lead font-semibold text-ink">Pick a look for your Quest</h2>
        <div role="radiogroup" aria-label="Template" className="flex flex-col gap-4">
          {live.map((template) => {
            const selected = document.templateId === template.id;
            const [cover] = template.CarouselFrames({ trip: { ...preview.trip, templateId: template.id } });
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
                <span className="relative block aspect-4/3 overflow-hidden rounded-md bg-surface-page">
                  <ScaledFrame width={CAROUSEL_SIZE.width}>{cover}</ScaledFrame>
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

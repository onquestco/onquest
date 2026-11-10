'use client';

import Link from 'next/link';
import { buttonClassName } from '@/design-system/components/Button';
import { templates } from '@/templates/registry';
import { useDraft } from './draftStore';
import { LostDraft } from './LostDraft';

/** Screen 6: the templates, each shown with the creator's own cover photo. */
export function ChooseTemplate({ tripKey }: { tripKey: string }) {
  const { key, document, previews, setDocument } = useDraft();
  if (key !== tripKey || !document) return <LostDraft />;
  const cover = document.coverPhotoId ? previews[document.coverPhotoId] : undefined;
  const live = Object.values(templates).filter((template) => template.status === 'live');

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col gap-6 bg-surface px-4 pt-6 pb-28">
      <h1 className="text-title text-ink">Choose a template</h1>
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
              <span className="block aspect-4/3 overflow-hidden rounded-md bg-surface-page">
                {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
              </span>
              <span className="flex justify-between px-2 pb-1 text-body font-semibold text-ink">
                {template.name}
                {selected && <span className="text-brand-strong">Selected</span>}
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
  );
}

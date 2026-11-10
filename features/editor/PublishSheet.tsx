'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { Sheet } from '@/design-system/components/Sheet';
import { TextField } from '@/design-system/components/TextField';
import type { Visibility } from '@/lib/trip/schema';
import { saveDraftNow } from './draftSaver';
import { useDraft } from './draftStore';
import type { Creator } from './getCreator';
import { publishQuest } from './publishActions';

const OPTIONS: { value: Visibility; label: string; help: string }[] = [
  { value: 'public', label: 'Public', help: 'Anyone can find it on your profile.' },
  { value: 'unlisted', label: 'Unlisted', help: 'Only people with the link.' },
  { value: 'private', label: 'Private', help: 'Only you. To remove photos completely, delete the Quest.' },
];

const CONFLICT = 'This Quest changed on another device. Reload to see the latest, then publish.';
const ERRORS: Record<string, string> = {
  conflict: CONFLICT,
  too_few_photos: 'A Quest needs at least 3 photos.',
  too_many_photos: 'A Quest holds 15 photos. Remove some first.',
  not_found: "This Quest isn't there any more.",
};
const FAILED = "Couldn't publish. Check your connection and try again.";

type Props = { tripKey: string; creator: Creator; onClose: () => void };

/**
 * Screen 8, first half. Visibility starts on the Settings default for a first publish (the
 * draft's visibility) and on the current visibility when it's published again. The draft is saved
 * first, so what's published is exactly what's on screen.
 */
export function PublishSheet({ tripKey, onClose }: Props) {
  const router = useRouter();
  const { document, published, visibility: current, setDocument, setPublished } = useDraft();
  const [visibility, setVisibility] = useState<Visibility>(published?.visibility ?? current);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string>();
  if (!document) return null;
  const title = document.title ?? '';

  async function publish() {
    setPublishing(true);
    setError(undefined);
    const saved = await saveDraftNow();
    const { savedAt, tripSavedAt } = useDraft.getState();
    if (saved === 'conflict') return finish(CONFLICT);
    if (saved === 'failed' || !savedAt || !tripSavedAt) return finish(FAILED);

    const result = await publishQuest({
      key: tripKey,
      basedOnDraft: savedAt,
      basedOnTrip: tripSavedAt,
      visibility,
      title: title.trim(),
    }).catch(() => null);
    if (!result?.ok) return finish(FAILED);
    if (!result.data.published) return finish(ERRORS[result.data.error] ?? FAILED);

    const slug = result.data.path.split('/').at(-1) ?? '';
    setPublished({ slug, visibility, path: result.data.path }, result.data.savedAt);
    router.push(`/quests/${tripKey}/share`);
  }

  function finish(message: string) {
    setPublishing(false);
    setError(message);
  }

  return (
    <Sheet open title="Publish your Quest" onClose={onClose}>
      <TextField
        label="Title"
        maxLength={60}
        showCount
        value={title}
        onChange={(event) => setDocument({ ...document, title: event.target.value })}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-label text-ink-muted">Who can see it</legend>
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer gap-3 rounded-md border p-3 has-focus-visible:outline-2 has-focus-visible:outline-brand-strong ${
              visibility === option.value ? 'border-brand-strong bg-brand-wash' : 'border-line'
            }`}
          >
            <input
              type="radio"
              name="visibility"
              value={option.value}
              checked={visibility === option.value}
              onChange={() => setVisibility(option.value)}
              className="mt-1 accent-brand-strong"
            />
            <span>
              <span className="block text-body font-semibold text-ink">{option.label}</span>
              <span className="text-label font-normal text-ink-muted">{option.help}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {error && (
        <p role="alert" className="text-label text-danger">
          {error}
        </p>
      )}
      <Button block disabled={publishing || !title.trim()} onClick={() => void publish()}>
        {publishing ? 'Publishing…' : 'Publish'}
      </Button>
    </Sheet>
  );
}

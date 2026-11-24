'use client';

import { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { Sheet } from '@/design-system/components/Sheet';
import type { Visibility } from '@/lib/trip/schema';

// PRD B4, first Post only: who can see it, starting on the Settings "New Quests start as" choice.

const OPTIONS: { value: Visibility; label: string; help: string }[] = [
  { value: 'public', label: 'Public', help: 'Anyone can find it on your profile' },
  { value: 'unlisted', label: 'Unlisted', help: 'Only people with the link' },
  { value: 'private', label: 'Private', help: 'Only you' },
];

type Props = {
  initial: Visibility;
  posting: boolean;
  error?: string;
  onPost: (visibility: Visibility) => void;
  onClose: () => void;
};

export function PostSheet({ initial, posting, error, onPost, onClose }: Props) {
  const [visibility, setVisibility] = useState<Visibility>(initial);
  return (
    <Sheet open title="Who can see this blog?" onClose={onClose}>
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Who can see this blog?</legend>
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer gap-3 rounded-md border p-3 has-focus-visible:outline-2 has-focus-visible:outline-brand-strong ${
              visibility === option.value ? 'border-brand-strong bg-brand-wash' : 'border-line'
            }`}
          >
            <input
              type="radio"
              name="blog-visibility"
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
      <Button block disabled={posting} onClick={() => onPost(visibility)}>
        {posting ? 'Posting…' : 'Post'}
      </Button>
    </Sheet>
  );
}

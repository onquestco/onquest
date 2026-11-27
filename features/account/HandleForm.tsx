'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition, type FormEvent } from 'react';
import { Button } from '@/design-system/components/Button';
import { TextField } from '@/design-system/components/TextField';
import { track } from '@/lib/analytics/client';
import { setHandle } from './actions';
import { usernameRejectedProperties, type UsernameRejection } from './onboardingProperties';

/** `done`: where to go once the username is saved (the welcome screens, or back to a Quest). */
export function HandleForm({ initialName, done }: { initialName: string; done: string }) {
  const router = useRouter();
  const [handle, setHandleValue] = useState('');
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  // Refusals shown before the save, for username_set.rejected_attempts.
  const rejectedAttempts = useRef(0);

  function rejected(reason: UsernameRejection) {
    rejectedAttempts.current += 1;
    track('username_rejected', usernameRejectedProperties(reason, 'onboarding'));
  }

  function save(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const analytics = { rejectedAttempts: rejectedAttempts.current };
      const result = await setHandle({ handle, name, analytics });
      if (!result.ok) {
        // Invalid input here is the handle's format: the name field is required and capped.
        if (result.error === 'Invalid input') rejected('invalid');
        setError(
          result.error === 'Invalid input' ? 'Use 3–20 letters, numbers or underscores' : result.error,
        );
      } else if (!result.data.saved) {
        rejected(result.data.rejected);
        setError(result.data.reason);
      } else {
        router.replace(done);
      }
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <TextField
        label="Your name"
        required
        maxLength={60}
        autoComplete="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

      <TextField
        label="Pick a handle"
        prefix="onquest.in/@"
        required
        maxLength={20}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={handle}
        onChange={(event) => setHandleValue(event.target.value.toLowerCase())}
        error={error}
      />

      <Button type="submit" disabled={pending} block>
        Continue
      </Button>
    </form>
  );
}

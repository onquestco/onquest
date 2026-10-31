'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { setHandle } from './actions';

export function HandleForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [handle, setHandleValue] = useState('');
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function save(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await setHandle({ handle, name });
      if (!result.ok) {
        setError(
          result.error === 'Invalid input' ? 'Use 3–20 letters, numbers or underscores' : result.error,
        );
      } else if (!result.data.saved) {
        setError(result.data.reason);
      } else {
        router.replace('/');
      }
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-slate-700">
        Your name
        <input
          required
          maxLength={60}
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-base"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        Pick a handle
        <span className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-3 text-base">
          <span className="text-slate-500">onquest.in/@</span>
          <input
            required
            maxLength={20}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={handle}
            onChange={(event) => setHandleValue(event.target.value.toLowerCase())}
            className="min-w-0 flex-1 outline-none"
          />
        </span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-slate-800 px-5 py-3 font-medium text-white disabled:opacity-50"
      >
        Continue
      </button>
    </form>
  );
}

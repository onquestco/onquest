'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { signInWithEmail, signInWithGoogle } from './actions';

export function LoginForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(initialError);
  const [emailSent, setEmailSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function sendEmail(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await signInWithEmail(email);
      setError(result.ok ? undefined : result.error);
      setEmailSent(result.ok);
    });
  }

  function continueWithGoogle() {
    startTransition(async () => {
      const result = await signInWithGoogle();
      if (result.ok) window.location.assign(result.data);
      else setError(result.error);
    });
  }

  if (emailSent) {
    return <p className="text-slate-700">Check your email for a sign-in link.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={pending}
        className="rounded-full bg-slate-800 px-5 py-3 font-medium text-white disabled:opacity-50"
      >
        Continue with Google
      </button>

      <form onSubmit={sendEmail} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Or get a link by email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-base"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full border-2 border-slate-800 px-5 py-3 font-medium text-slate-800 disabled:opacity-50"
        >
          Send sign-in link
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Button } from '@/design-system/components/Button';
import { TextField } from '@/design-system/components/TextField';
import type { SignInReturn } from '@/lib/auth/next';
import { signInWithEmail, signInWithGoogle } from './actions';

/** `signInReturn` rides along through Google or the email link, so sign-in lands back where it started. */
export function LoginForm({
  initialError,
  signInReturn,
}: {
  initialError?: string;
  signInReturn: SignInReturn;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(initialError);
  const [emailSent, setEmailSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function sendEmail(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await signInWithEmail(email, signInReturn);
      setError(result.ok ? undefined : result.error);
      setEmailSent(result.ok);
    });
  }

  function continueWithGoogle() {
    startTransition(async () => {
      const result = await signInWithGoogle(signInReturn);
      if (result.ok) window.location.assign(result.data);
      else setError(result.error);
    });
  }

  if (emailSent) {
    return <p className="text-body text-ink">Check your email for a sign-in link.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={continueWithGoogle} disabled={pending} block>
        Continue with Google
      </Button>

      <form onSubmit={sendEmail} className="flex flex-col gap-3">
        <TextField
          label="Or get a link by email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={pending} block>
          Send sign-in link
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-label font-normal text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState, useTransition, type FormEvent } from 'react';
import { Button } from '@/design-system/components/Button';
import { TextField } from '@/design-system/components/TextField';
import type { SignInReturn } from '@/lib/auth/next';
import { signInWithEmail, signInWithGoogle } from './actions';

// Email links need our own mail sender (Resend); until it's set up, Supabase only emails its own team,
// so friends see Google only. Set NEXT_PUBLIC_EMAIL_SIGN_IN=on once email works.
const EMAIL_SIGN_IN = process.env.NEXT_PUBLIC_EMAIL_SIGN_IN === 'on';

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
  // Screen 1: email is a quiet link that opens the field, so Google stays the one main action.
  const [usingEmail, setUsingEmail] = useState(false);
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

      {!EMAIL_SIGN_IN ? null : usingEmail ? (
        <form onSubmit={sendEmail} className="flex flex-col gap-3">
          <TextField
            label="Your email"
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
      ) : (
        <Button variant="quiet" block onClick={() => setUsingEmail(true)}>
          Email me a sign-in link
        </Button>
      )}

      <p className="text-center text-caption text-ink-muted">
        By continuing you confirm you&apos;re 18 or older and agree to our{' '}
        <Link
          href="/terms?from=sign_in"
          target="_blank"
          className="inline-flex min-h-11 items-center underline"
        >
          Terms
        </Link>{' '}
        and{' '}
        <Link
          href="/privacy?from=sign_in"
          target="_blank"
          className="inline-flex min-h-11 items-center underline"
        >
          Privacy policy
        </Link>
        .
      </p>

      {error && (
        <p role="alert" className="text-label font-normal text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/features/account/getCurrentUser';
import { Logo } from '@/design-system/components/Logo';
import { LoginForm } from '@/features/account/LoginForm';
import { signInTitle } from '@/features/account/signInCopy';
import { readSignInReturn, withSignInReturn } from '@/lib/auth/next';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Sign in | ${SITE_NAME}`, robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const signInReturn = readSignInReturn(params);
  // Already signed in: onboarding finishes the account if needed, then goes on to `next`.
  if (await getCurrentUser()) redirect(withSignInReturn('/onboarding', signInReturn));

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-8 px-4">
      <Logo />
      <h1 className="text-title text-ink">{signInTitle(signInReturn.intent, signInReturn.next)}</h1>
      <LoginForm
        signInReturn={signInReturn}
        initialError={
          params.error === 'link'
            ? 'That link has expired. Send a new one.'
            : params.error
              ? "Sign-in didn't work. Try again."
              : undefined
        }
      />
    </main>
  );
}

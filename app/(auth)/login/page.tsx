import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/features/account/getCurrentUser';
import { Contour } from '@/design-system/components/Contour';
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
    <main className="relative flex min-h-svh flex-col bg-surface">
      <Contour />
      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 px-6 py-8 text-center">
        <Logo height={52} />
        <h1 className="mt-6 text-title text-ink">{signInTitle(signInReturn.intent, signInReturn.next)}</h1>
        <p className="text-body text-ink-muted">
          Pick your best trip photos. We&apos;ll turn them into an animated scrapbook your friends will
          actually open.
        </p>
      </div>
      <div className="relative mx-auto w-full max-w-sm px-4 pb-6">
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
      </div>
    </main>
  );
}

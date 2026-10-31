import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/features/account/getCurrentUser';
import { LoginForm } from '@/features/account/LoginForm';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Sign in | ${SITE_NAME}`, robots: { index: false } };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  if (await getCurrentUser()) redirect('/onboarding');
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-3xl font-semibold text-slate-800">Sign in to {SITE_NAME}</h1>
      <LoginForm initialError={error ? 'That sign-in link did not work. Please try again.' : undefined} />
    </main>
  );
}

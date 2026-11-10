import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser, getMyProfile } from '@/features/account/getCurrentUser';
import { Logo } from '@/design-system/components/Logo';
import { HandleForm } from '@/features/account/HandleForm';
import { afterSignIn, readSignInReturn } from '@/lib/auth/next';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Welcome | ${SITE_NAME}` };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function OnboardingPage({ searchParams }: Props) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const signInReturn = readSignInReturn(params);
  if (await getMyProfile(user.id)) redirect(afterSignIn(signInReturn, true));
  // Coming from a Quest or Create: go straight back, skipping the welcome screens (F-A2).
  const done = params.next ? afterSignIn(signInReturn, true) : '/welcome';

  // Google gives us a name to start from. Magic-link users type their own.
  const suggestedName = user.user_metadata.full_name;

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-8 px-4">
      <Logo />
      <h1 className="text-title text-ink">Welcome to {SITE_NAME}</h1>
      <HandleForm initialName={typeof suggestedName === 'string' ? suggestedName : ''} done={done} />
    </main>
  );
}

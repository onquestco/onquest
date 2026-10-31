import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser, getMyProfile } from '@/features/account/getCurrentUser';
import { HandleForm } from '@/features/account/HandleForm';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Welcome | ${SITE_NAME}` };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (await getMyProfile(user.id)) redirect('/');

  // Google gives us a name to start from. Magic-link users type their own.
  const suggestedName = user.user_metadata.full_name;

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-3xl font-semibold text-slate-800">Welcome to {SITE_NAME}</h1>
      <HandleForm initialName={typeof suggestedName === 'string' ? suggestedName : ''} />
    </main>
  );
}

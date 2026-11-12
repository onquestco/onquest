import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/features/account/getCurrentUser';
import { NewQuestView } from '@/features/editor/NewQuestView';
import { QuestCreateSourceSchema } from '@/lib/analytics/sources';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Create a Quest | ${SITE_NAME}`, robots: { index: false } };

type Props = { searchParams: Promise<{ source?: string; intent?: string }> };

export default async function NewQuestPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/quests/new');
  const params = await searchParams;
  // Coming back from sign-in via "Make your own Quest" counts as that source.
  const source = QuestCreateSourceSchema.safeParse(
    params.source ?? (params.intent === 'make_your_own' ? 'make_your_own' : undefined),
  );
  return <NewQuestView userId={user.id} source={source.success ? source.data : 'create_menu'} />;
}

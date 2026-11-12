import { redirect } from 'next/navigation';

type Props = { searchParams: Promise<Record<string, string | undefined>> };

// No landing page yet: onquest.in opens on the prototype's first screen, sign-in. Signed-in
// people go straight on to Home from there. `?deleted=1` rides along for the deleted-account notice.
export default async function HomePage({ searchParams }: Props) {
  const { deleted } = await searchParams;
  redirect(deleted === '1' ? '/login?deleted=1' : '/login');
}

import { redirect } from 'next/navigation';

type Props = { searchParams: Promise<Record<string, string | undefined>> };

// onquest.in opens on Home for everyone (OQ-16, Swati 23 Nov): look around signed out, sign in from
// a popup when you like, comment, follow or create. `?deleted=1` still goes to sign-in for its notice.
export default async function HomePage({ searchParams }: Props) {
  const { deleted } = await searchParams;
  redirect(deleted === '1' ? '/login?deleted=1' : '/home');
}

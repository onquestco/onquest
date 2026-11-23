import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@/features/account/getCurrentUser';

// Everything here needs an account. Home and Explore (in (tabs)) are open to everyone (OQ-16);
// in the browser, links to these pages open the sign-in popup instead (SignInSheet).
export default async function SignedInLayout({ children }: { children: ReactNode }) {
  if (!(await getCurrentUser())) redirect('/login');
  return children;
}

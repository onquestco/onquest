import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@/features/account/getCurrentUser';

export const metadata: Metadata = { robots: { index: false } };

export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!(await getCurrentUser())) redirect('/login');
  return children;
}

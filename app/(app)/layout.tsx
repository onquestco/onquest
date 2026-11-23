import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { robots: { index: false } };

// Signed-in pages are in (signed-in), which checks. Home and Explore are open to everyone (OQ-16).
export default function AppLayout({ children }: { children: ReactNode }) {
  return children;
}

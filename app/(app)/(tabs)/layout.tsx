import type { ReactNode } from 'react';
import { getCreator } from '@/features/editor/getCreator';
import { AppBottomBar } from '@/features/shell/AppBottomBar';
import { AppHeader } from '@/features/shell/AppHeader';

// Home, Explore, Quests and Profile share the header and bottom bar. The create flow lives in
// app/(app)/(create) and has neither.
export default async function TabsLayout({ children }: { children: ReactNode }) {
  const creator = await getCreator();
  return (
    <div className="min-h-svh bg-surface-page pb-24">
      <AppHeader />
      {children}
      <AppBottomBar handle={creator.handle} />
    </div>
  );
}

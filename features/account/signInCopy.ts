import type { SignInIntent } from '@/lib/auth/next';

/** Screen 1's title: says why sign-in is needed when it interrupts something (PRD screen 1). */
export function signInTitle(intent: SignInIntent | undefined, next: string): string {
  if (intent === 'like') return 'Sign in to like';
  if (intent === 'comment') return 'Sign in to comment';
  if (intent === 'make_your_own' || next.startsWith('/quests/new')) return 'Sign in to make your Quest';
  return 'Turn your trip into a Quest';
}

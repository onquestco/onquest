import Link from 'next/link';
import type { ReactNode } from 'react';

// The app's bottom bar: tabs either side of one raised primary action (Create).

export type Tab = { href: string; label: string; icon: ReactNode; active: boolean };

type Props = {
  left: Tab[];
  right: Tab[];
  action: { label: string; icon: ReactNode; onClick: () => void };
};

function TabLink({ tab }: { tab: Tab }) {
  return (
    <Link
      href={tab.href}
      aria-current={tab.active ? 'page' : undefined}
      className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-caption focus-visible:outline-2 focus-visible:outline-brand-strong ${
        tab.active ? 'font-semibold text-brand-strong' : 'text-ink-muted'
      }`}
    >
      {tab.icon}
      {tab.label}
    </Link>
  );
}

export function BottomBar({ left, right, action }: Props) {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-center px-2 py-1">
        {left.map((tab) => (
          <TabLink key={tab.href} tab={tab} />
        ))}
        <button
          type="button"
          onClick={action.onClick}
          className="mx-2 -mt-6 flex size-14 items-center justify-center rounded-pill bg-brand-strong text-on-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
        >
          {action.icon}
          <span className="sr-only">{action.label}</span>
        </button>
        {right.map((tab) => (
          <TabLink key={tab.href} tab={tab} />
        ))}
      </div>
    </nav>
  );
}

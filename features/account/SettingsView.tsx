'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type ReactNode } from 'react';
import { ConfirmDialog } from '@/design-system/components/ConfirmDialog';
import { ChevronIcon } from '@/design-system/components/icons';
import { Segmented } from '@/design-system/components/Segmented';
import { Switch } from '@/design-system/components/Switch';
import { Toast } from '@/design-system/components/Toast';
import { TopBar } from '@/design-system/components/TopBar';
import { WhatIsAQuestSheet } from '@/features/home/WhatIsAQuestSheet';
import type { ProfileSettings } from '@/lib/profile/schema';
import { SUPPORT_EMAIL } from '@/lib/site';
import { saveSettings, signOut } from './actions';
import { DeleteAccountDialog } from './DeleteAccountDialog';

type Props = { email: string; settings: ProfileSettings; savedAt: string };

// Screen 17 as grouped rows, like the prototype: a card per group, a row per setting, › on rows
// that open something.
function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="flex flex-col divide-y divide-line overflow-hidden rounded-md border border-line bg-surface"
    >
      {title && (
        <h2 className="px-4 pt-3 pb-1 text-caption font-semibold tracking-wide text-ink-muted uppercase">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

const row =
  'flex min-h-13 w-full items-center justify-between gap-3 px-4 py-2 text-left focus-visible:outline-2 focus-visible:outline-brand-strong';

function RowText({ label, hint, danger }: { label: string; hint?: string; danger?: boolean }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className={`text-body ${danger ? 'text-danger' : 'text-ink'}`}>{label}</span>
      {hint && <span className="truncate text-label font-normal text-ink-muted">{hint}</span>}
    </span>
  );
}

const chevron = (
  <span className="text-ink-subtle">
    <ChevronIcon />
  </span>
);

/**
 * Screen 17. Each switch saves at once. Taps are saved one after another, each on the savedAt the
 * last one returned, so quick taps never conflict with each other (spec C §3.8).
 */
export function SettingsView({ email, settings: initial, savedAt }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [notice, setNotice] = useState<string>();
  const [dialog, setDialog] = useState<'signout' | 'delete' | 'explain' | null>(null);
  const latestSavedAt = useRef(savedAt);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  function change<Name extends keyof ProfileSettings>(name: Name, value: ProfileSettings[Name]) {
    const before = settings[name];
    setSettings((current) => ({ ...current, [name]: value }));
    queue.current = queue.current.then(async () => {
      const result = await saveSettings({
        basedOn: latestSavedAt.current,
        settings: { [name]: value },
      }).catch(() => null);
      if (result?.ok && result.data.saved) {
        latestSavedAt.current = result.data.savedAt;
        return;
      }
      setSettings((current) => ({ ...current, [name]: before }));
      setNotice(
        result?.ok && result.data.error === 'conflict'
          ? 'Settings changed on another device. Reload to see them.'
          : "Couldn't save that. Try again.",
      );
    });
  }

  async function leave() {
    await signOut({}).catch(() => null);
    router.replace('/');
    router.refresh();
  }

  return (
    <>
      <TopBar title="Settings" fallback="/home" />
      <main className="mx-auto flex max-w-lg flex-col gap-4 bg-surface-page px-4 py-4">
        <Section title="Account">
          <Link href="/settings/profile" className={row}>
            <RowText label="Edit profile" hint="Name, username, photo, bio" />
            {chevron}
          </Link>
          <div className={row}>
            <RowText label="Email" hint={email} />
          </div>
        </Section>

        <Section title="Email me when">
          <div className="flex flex-col gap-1 px-4 py-2">
            <Switch
              label="Someone likes my Quest"
              checked={settings.emailOnLike}
              onChange={(on) => change('emailOnLike', on)}
            />
            <Switch
              label="Someone comments"
              checked={settings.emailOnComment}
              onChange={(on) => change('emailOnComment', on)}
            />
            <Switch
              label="Someone follows me"
              checked={settings.emailOnFollow}
              onChange={(on) => change('emailOnFollow', on)}
            />
            <p className="pb-1 text-label font-normal text-ink-muted">
              You always see these in the bell inside OnQuest.
            </p>
          </div>
        </Section>

        <Section title="Privacy">
          <div className="flex flex-col gap-2 px-4 py-3">
            <RowText label="New Quests start as" hint="You can change it on each Quest." />
            <Segmented
              label="New Quests start as"
              value={settings.defaultVisibility}
              onChange={(visibility) => change('defaultVisibility', visibility)}
              options={[
                { value: 'public', label: 'Public' },
                { value: 'unlisted', label: 'Unlisted' },
                { value: 'private', label: 'Private' },
              ]}
            />
          </div>
          <div className="px-4 py-2">
            <Switch
              label="Show places on my profile"
              checked={settings.showPlaces}
              onChange={(on) => change('showPlaces', on)}
            />
          </div>
        </Section>

        <Section title="Help">
          <button type="button" className={row} onClick={() => setDialog('explain')}>
            <RowText label="What's a Quest?" />
            {chevron}
          </button>
          <a href={`mailto:${SUPPORT_EMAIL}?subject=OnQuest%20feedback`} className={row}>
            <RowText label="Send feedback" hint="Tell the OnQuest team what to fix" />
            {chevron}
          </a>
          <Link href="/privacy?from=settings" className={row}>
            <RowText label="Privacy policy" />
            {chevron}
          </Link>
          <Link href="/terms?from=settings" className={row}>
            <RowText label="Terms of use" />
            {chevron}
          </Link>
        </Section>

        <Section>
          <button type="button" className={row} onClick={() => setDialog('signout')}>
            <RowText label="Sign out" />
            {chevron}
          </button>
          <button type="button" className={row} onClick={() => setDialog('delete')}>
            <RowText label="Delete account" danger />
          </button>
        </Section>

        <ConfirmDialog
          open={dialog === 'signout'}
          title="Sign out?"
          message="You can sign back in any time with Google or an email link."
          confirmLabel="Sign out"
          onConfirm={() => void leave()}
          onCancel={() => setDialog(null)}
        />
        {dialog === 'delete' && <DeleteAccountDialog onClose={() => setDialog(null)} />}
        {dialog === 'explain' && <WhatIsAQuestSheet onClose={() => setDialog(null)} />}
        {notice && <Toast message={notice} onDismiss={() => setNotice(undefined)} />}
      </main>
    </>
  );
}

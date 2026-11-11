'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type ReactNode } from 'react';
import { Button, buttonClassName } from '@/design-system/components/Button';
import { ConfirmDialog } from '@/design-system/components/ConfirmDialog';
import { Segmented } from '@/design-system/components/Segmented';
import { Switch } from '@/design-system/components/Switch';
import { Toast } from '@/design-system/components/Toast';
import { WhatIsAQuestSheet } from '@/features/home/WhatIsAQuestSheet';
import type { ProfileSettings } from '@/lib/profile/schema';
import { SUPPORT_EMAIL } from '@/lib/site';
import { saveSettings, signOut } from './actions';
import { DeleteAccountDialog } from './DeleteAccountDialog';

type Props = { email: string; settings: ProfileSettings; savedAt: string };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-1 border-b border-line pb-4">
      <h2 className="text-label font-semibold text-ink-muted">{title}</h2>
      {children}
    </section>
  );
}

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
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-4">
      <h1 className="text-title text-ink">Settings</h1>

      <Section title="Account">
        <Link href="/settings/profile" className={buttonClassName({ variant: 'secondary', block: true })}>
          Edit profile
        </Link>
        <p className="pt-2 text-body text-ink">
          Email <span className="text-ink-muted">{email}</span>
        </p>
      </Section>

      <Section title="Email me when">
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
      </Section>

      <Section title="Privacy">
        <p className="text-body text-ink">New Quests start as</p>
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
        <Switch
          label="Show places on my profile"
          checked={settings.showPlaces}
          onChange={(on) => change('showPlaces', on)}
        />
      </Section>

      <Section title="Help">
        <Button variant="quiet" onClick={() => setDialog('explain')}>
          What&apos;s a Quest?
        </Button>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=OnQuest%20feedback`}
          className={buttonClassName({ variant: 'quiet' })}
        >
          Send feedback
        </a>
        <Link href="/privacy?from=settings" className={buttonClassName({ variant: 'quiet' })}>
          Privacy policy
        </Link>
        <Link href="/terms?from=settings" className={buttonClassName({ variant: 'quiet' })}>
          Terms of use
        </Link>
      </Section>

      <div className="flex flex-col gap-2">
        <Button variant="secondary" block onClick={() => setDialog('signout')}>
          Sign out
        </Button>
        <Button variant="danger" block onClick={() => setDialog('delete')}>
          Delete account
        </Button>
      </div>

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
  );
}

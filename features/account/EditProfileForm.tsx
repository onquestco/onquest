'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Avatar } from '@/design-system/components/Avatar';
import { Button } from '@/design-system/components/Button';
import { TextField } from '@/design-system/components/TextField';
import { processInTurn } from '@/features/editor/browserUploadDeps';
import { HandleSchema } from '@/lib/handles';
import { uploadAvatar } from '@/lib/storage';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { checkHandle, saveProfile } from './actions';

type Initial = {
  userId: string;
  name: string;
  handle: string;
  bio: string;
  homeCity: string;
  avatarUrl?: string;
  savedAt: string;
};

type Photo = { kind: 'keep' } | { kind: 'remove' } | { kind: 'new'; id: string; previewUrl: string };

const ERRORS: Record<string, string> = {
  conflict: 'Your profile changed on another device. Reload to see the latest.',
  handle_taken: 'That username is taken.',
  handle_reserved: "That username can't be used.",
};

/** Screen 16: photo, name, username (checked as you type), home city, bio (spec C §3.8). */
export function EditProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [handle, setHandle] = useState(initial.handle);
  const [homeCity, setHomeCity] = useState(initial.homeCity);
  const [bio, setBio] = useState(initial.bio);
  const [photo, setPhoto] = useState<Photo>({ kind: 'keep' });
  const [available, setAvailable] = useState<boolean | null>(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);

  const cleanHandle = handle.trim().toLowerCase();
  const handleChanged = cleanHandle !== initial.handle;
  const handleValid = HandleSchema.safeParse(cleanHandle).success;

  // Live availability, after a short pause in typing.
  useEffect(() => {
    if (!handleChanged || !handleValid) return;
    let current = true;
    const timer = setTimeout(() => {
      void checkHandle({ handle: cleanHandle }).then((result) => {
        if (current) setAvailable(result.ok ? result.data.available : null);
      });
    }, 400);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [cleanHandle, handleChanged, handleValid]);

  const changed =
    name.trim() !== initial.name ||
    handleChanged ||
    homeCity.trim() !== initial.homeCity ||
    bio.trim() !== initial.bio ||
    photo.kind !== 'keep';
  const nameError = name.trim() ? undefined : 'Add your name so friends recognise you.';
  const handleError = !handleValid
    ? '3 to 20 letters, numbers or _'
    : handleChanged && available === false
      ? 'That username is taken.'
      : undefined;
  const canSave = changed && !nameError && !handleError && (!handleChanged || available === true) && !saving;

  function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) setPhoto({ kind: 'new', id: crypto.randomUUID(), previewUrl: URL.createObjectURL(file) });
  }

  async function save() {
    setSaving(true);
    setError(undefined);
    try {
      let avatarPhotoId: string | null | 'keep' = photo.kind === 'remove' ? null : 'keep';
      if (photo.kind === 'new') {
        const file = await fetch(photo.previewUrl).then((response) => response.blob());
        const image = await processInTurn(new File([file], 'avatar'));
        await uploadAvatar(createBrowserSupabase(), initial.userId, photo.id, image.thumb);
        avatarPhotoId = photo.id;
      }
      const result = await saveProfile({
        basedOn: initial.savedAt,
        name: name.trim(),
        handle: cleanHandle,
        bio: bio.trim(),
        homeCity: homeCity.trim(),
        avatarPhotoId,
      });
      if (!result.ok) throw new Error(result.error);
      if (!result.data.saved) return setError(ERRORS[result.data.error] ?? "Couldn't save. Try again.");
      router.push(`/@${cleanHandle}`);
      router.refresh();
    } catch {
      setError("Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const avatar =
    photo.kind === 'new' ? photo.previewUrl : photo.kind === 'remove' ? undefined : initial.avatarUrl;

  return (
    <>
      {/* The prototype's bar: Cancel · Edit profile · Save, Save greyed until something changes. */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto grid max-w-lg grid-cols-3 items-center px-2 py-1">
          <Button variant="quiet" className="justify-self-start px-2" onClick={() => router.back()}>
            Cancel
          </Button>
          <h1 className="text-center text-body font-semibold text-ink">Edit profile</h1>
          <Button
            variant="quiet"
            className="justify-self-end px-2"
            disabled={!canSave}
            onClick={() => void save()}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </header>
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-4">
        <div className="flex flex-col items-center gap-1.5">
          <Avatar name={name || initial.handle} src={avatar} size={96} />
          <div className="flex gap-1">
            <Button variant="quiet" onClick={() => fileInput.current?.click()}>
              {avatar ? 'Change photo' : 'Add a photo'}
            </Button>
            {avatar && (
              <Button variant="quiet" className="text-danger" onClick={() => setPhoto({ kind: 'remove' })}>
                Remove
              </Button>
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/*" className="sr-only" onChange={pickPhoto} />
        </div>

        <TextField
          label="Name"
          showCount
          value={name}
          maxLength={40}
          onChange={(event) => setName(event.target.value)}
          error={nameError}
        />
        <TextField
          label="Username"
          showCount
          value={handle}
          maxLength={20}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => {
            setHandle(event.target.value);
            setAvailable(event.target.value.trim().toLowerCase() === initial.handle ? true : null);
          }}
          error={handleError}
          hint={
            handleChanged
              ? `Your Quest links change to onquest.in/@${cleanHandle}. Old links keep working.`
              : `onquest.in/@${cleanHandle}`
          }
        />
        <TextField
          label={
            <>
              Home city <span className="font-normal">Optional</span>
            </>
          }
          value={homeCity}
          maxLength={60}
          onChange={(event) => setHomeCity(event.target.value)}
        />
        <label className="flex flex-col gap-1">
          <span className="flex justify-between text-label text-ink-muted">
            Bio
            <span className="text-caption">{bio.length}/150</span>
          </span>
          <textarea
            rows={3}
            maxLength={150}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            className="w-full resize-none rounded-sm border border-line-control bg-surface px-3 py-3 text-body text-ink focus:border-brand-strong focus:outline-2 focus:outline-brand-strong"
          />
        </label>

        {error && (
          <p role="alert" className="text-label text-danger">
            {error}
          </p>
        )}
      </main>
    </>
  );
}

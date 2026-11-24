'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useStore } from 'zustand';
import { Button } from '@/design-system/components/Button';
import { Toast } from '@/design-system/components/Toast';
import { track } from '@/lib/analytics/client';
import type { QuestCard } from '@/lib/trip/cards';
import { discardBlogDraft } from './actions';
import type { BlogDraftSaver } from './blogDraftSaver';
import { createBlogDraftStore, type BlogDraftStore, type InitialBlogDraft } from './blogDraftStore';
import { BlogPreview, type Writer } from './BlogPreview';
import { ComposerTopBar } from './ComposerTopBar';
import { LinkQuestRow } from './LinkQuestRow';
import { browserStorage, forgetNewBlogKey, removeLocalDraft } from './localDraft';
import { LostBlog } from './LostBlog';
import { PhotoRow } from './PhotoRow';
import { PlaceRow } from './PlaceRow';
import { canPost, hasContent, POST_EMPTY_MESSAGE } from './postRules';
import { PostSheet } from './PostSheet';
import { BodyField, TitleField } from './TitleField';
import { useBlogAutosave } from './useBlogAutosave';
import { CONFLICT_MESSAGE, usePostBlog } from './usePostBlog';

// The blog composer (PRD B2, spec §6.1): one screen with a title, photos, the text, a place and a
// linked Quest, saved as you type. Preview shows it as readers will; Post asks who can see it the
// first time.

const SAVED_AS_DRAFT = 'Saved as a draft.';
/** Long enough to read "Saved as a draft." before the composer closes. */
const CLOSE_DELAY_MS = 1200;

type Props = {
  initial: InitialBlogDraft;
  /** The writer's published Quests for "Link a Quest", newest first. */
  quests: QuestCard[];
  writer: Writer;
};

export function BlogComposer({ initial, quests, writer }: Props) {
  // One store per composer, from what the page loaded: the server renders the draft as it is.
  const [store] = useState(() => createBlogDraftStore(initial));
  const saver = useBlogAutosave(store);
  return <ComposerScreen store={store} saver={saver} quests={quests} writer={writer} />;
}

type ScreenProps = { store: BlogDraftStore; saver: BlogDraftSaver; quests: QuestCard[]; writer: Writer };

function ComposerScreen({ store, saver, quests, writer }: ScreenProps) {
  const router = useRouter();
  const mode = useStore(store, (state) => state.mode);
  const lost = useStore(store, (state) => state.lost);
  const conflict = useStore(store, (state) => state.saveStatus === 'conflict');
  const document = useStore(store, (state) => state.document);
  const pending = useStore(store, (state) => state.pending);
  const published = useStore(store, (state) => state.published);
  const previews = useStore(store, (state) => state.previews);
  const photoFolder = useStore(store, (state) => state.photoFolder);
  const blogVisibility = useStore(store, (state) => state.published?.visibility ?? state.visibility);
  const { post, posting, error, clearError } = usePostBlog(store, saver);
  const [choosing, setChoosing] = useState(false);
  const [toast, setToast] = useState<string>();
  const clearToast = useCallback(() => setToast(undefined), []);
  const check = canPost(document, pending);

  if (lost) return <LostBlog />;

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push('/quests');
  }

  async function close() {
    const { key, ownerKey, document: current, pending: waiting, draftSavedAt, status } = store.getState();
    if (!hasContent(current) && waiting.length === 0 && status === 'draft') {
      // Close on an empty draft discards it (PRD B2). A posted blog is never discarded from here.
      saver.abandon();
      const storage = browserStorage();
      removeLocalDraft(storage, key);
      forgetNewBlogKey(storage, key, ownerKey);
      if (draftSavedAt !== null) await discardBlogDraft({ key }).catch(() => null);
      return goBack();
    }
    void saver.saveNow();
    setToast(SAVED_AS_DRAFT);
    setTimeout(goBack, CLOSE_DELAY_MS);
  }

  function preview() {
    track('blog_previewed', { blog_id: store.getState().key });
    store.getState().setMode('preview');
    window.scrollTo({ top: 0 });
  }

  function tapPost() {
    if (!check.ok) {
      if (check.reason === 'empty') setToast(POST_EMPTY_MESSAGE);
      return;
    }
    clearError();
    if (published) void post(null);
    else setChoosing(true);
  }

  const linkedQuest = quests.find((quest) => quest.key === document.linkedQuestKey);

  return (
    <div className="min-h-svh bg-surface">
      <ComposerTopBar
        store={store}
        check={check}
        posting={posting && !choosing}
        onClose={() => void close()}
        onPreview={preview}
        onPost={tapPost}
      />
      {conflict && (
        <div role="alert" className="border-b border-line bg-brand-wash">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-2">
            <p className="text-label text-ink">{CONFLICT_MESSAGE}</p>
            <Button variant="secondary" className="shrink-0" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        </div>
      )}
      {error && !choosing && (
        <p role="alert" className="mx-auto max-w-lg px-4 pt-3 text-label text-danger">
          {error}
        </p>
      )}
      <main className="mx-auto flex max-w-lg flex-col gap-5 px-4 pt-3 pb-16">
        {mode === 'preview' ? (
          <BlogPreview
            document={document}
            photoFolder={photoFolder}
            previews={previews}
            writer={writer}
            linkedQuest={linkedQuest}
            blogVisibility={blogVisibility}
          />
        ) : (
          <>
            <TitleField store={store} />
            <PhotoRow store={store} />
            <BodyField store={store} />
            <PlaceRow store={store} saver={saver} />
            <LinkQuestRow store={store} saver={saver} quests={quests} />
          </>
        )}
      </main>
      {choosing && (
        <PostSheet
          initial={store.getState().visibility}
          posting={posting}
          error={error}
          onPost={(visibility) => void post(visibility)}
          onClose={() => {
            setChoosing(false);
            clearError();
          }}
        />
      )}
      {toast && <Toast message={toast} onDismiss={clearToast} />}
    </div>
  );
}

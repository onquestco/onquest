import { describe, expect, it } from 'vitest';
import type { BlogViewer } from '@/lib/social/schema';
import type { QuestCard } from '@/lib/trip/cards';
import { linkedQuestView } from './linkedQuest';

// What "From this trip" shows to readers and to the writer (spec D12, PRD B9).

const quest = (visibility: QuestCard['visibility']): QuestCard => ({
  key: '00000000-0000-4000-8000-000000000010',
  title: '3 days in Goa',
  status: 'published',
  visibility,
  path: '/@riya/3-days-in-goa',
  pageCount: 5,
  photoCount: 15,
  places: ['Goa'],
  likeCount: 0,
  commentCount: 0,
  savedAt: '2026-11-20 10:00:00+00',
  owner: { key: '00000000-0000-4000-8000-000000000001', handle: 'riya', name: 'Riya' },
});

const reader: BlogViewer = {
  signedIn: true,
  liked: false,
  isOwner: false,
  followingOwner: false,
  linkedQuestHidden: false,
};
const writer = (hidden: boolean, own?: QuestCard): BlogViewer => ({
  ...reader,
  isOwner: true,
  linkedQuestHidden: hidden,
  ownLinkedQuest: own,
});

describe('linkedQuestView', () => {
  it('readers see the card get_blog_quest allowed, signed in or not', () => {
    const card = quest('public');
    expect(linkedQuestView(card, null)).toEqual({ quest: card, hiddenNote: false });
    expect(linkedQuestView(card, reader)).toEqual({ quest: card, hiddenNote: false });
  });

  it('readers see nothing when the Quest is private, deleted, or unlisted on a public blog', () => {
    expect(linkedQuestView(null, null)).toBeNull();
    expect(linkedQuestView(null, reader)).toBeNull();
  });

  it('the writer of a public blog linked to an unlisted Quest gets the card and the note', () => {
    const own = quest('unlisted');
    expect(linkedQuestView(null, writer(true, own))).toEqual({ quest: own, hiddenNote: true });
  });

  it('the writer of a blog whose linked Quest was made private gets the card and the note', () => {
    const own = quest('private');
    expect(linkedQuestView(null, writer(true, own))).toEqual({ quest: own, hiddenNote: true });
  });

  it('the writer of a blog whose linked Quest was deleted gets only the note', () => {
    expect(linkedQuestView(null, writer(true))).toEqual({ quest: undefined, hiddenNote: true });
  });

  it('the writer sees the readers’ card, without a note, when readers can see it', () => {
    const card = quest('public');
    expect(linkedQuestView(card, writer(false))).toEqual({ quest: card, hiddenNote: false });
  });

  it('a blog without a linked Quest shows nothing, to the writer too', () => {
    expect(linkedQuestView(null, writer(false))).toBeNull();
  });
});

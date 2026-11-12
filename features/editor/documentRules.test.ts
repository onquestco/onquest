import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { QuestDocument } from '@/lib/trip/schema';
import { documentProblem } from './documentRules';

function questDocument(photoCount: number, perPage = 3): QuestDocument {
  const photos = Array.from({ length: photoCount }, () => ({ id: randomUUID(), width: 10, height: 10 }));
  const days = [];
  for (let i = 0; i < photos.length; i += perPage) {
    days.push({
      id: randomUUID(),
      placeIds: [],
      photoIds: photos.slice(i, i + perPage).map((photo) => photo.id),
    });
  }
  return { templateId: 'beach', content: { favourites: [], days }, photos, places: [] };
}

describe('documentProblem', () => {
  it('accepts a 15-photo, 5-page Quest', () => {
    expect(documentProblem(questDocument(15))).toBeNull();
  });

  it('refuses a 16th photo, a 6th page and a 4th photo on a page', () => {
    expect(documentProblem(questDocument(16))).toBe('too_many_photos');
    expect(documentProblem(questDocument(12, 2))).toBe('too_many_pages');
    expect(documentProblem(questDocument(4, 4))).toBe('page_too_full');
  });

  it('refuses pages that point at photos or places the Quest does not have', () => {
    const document = questDocument(2);
    document.content.days[0]!.photoIds.push(randomUUID());
    expect(documentProblem(document)).toBe('unknown_photo');

    const withPlace = questDocument(3);
    withPlace.content.days[0]!.placeIds.push(randomUUID());
    expect(documentProblem(withPlace)).toBe('unknown_place');
  });

  it('refuses one photo on two pages', () => {
    const document = questDocument(6);
    document.content.days[1]!.photoIds[0] = document.content.days[0]!.photoIds[0]!;
    expect(documentProblem(document)).toBe('photo_on_two_pages');
  });
});

import { describe, expect, it } from 'vitest';
import { unsubscribeUrl, verifyUnsubscribe } from './links';

const USER = '00000000-0000-4000-8000-000000000001';
const params = (url: string) => new URL(url).searchParams;

describe('unsubscribe links', () => {
  it('verify for the person and switch they were made for', () => {
    const url = unsubscribeUrl(USER, 'like', 'v1:first-secret');
    expect(verifyUnsubscribe(params(url), 'v1:first-secret')).toEqual({ userKey: USER, kind: 'like' });
  });

  it("can't be changed to another person or switch", () => {
    const query = params(unsubscribeUrl(USER, 'like', 'v1:first-secret'));
    query.set('k', 'comment');
    expect(verifyUnsubscribe(query, 'v1:first-secret')).toBeNull();
    const other = params(unsubscribeUrl(USER, 'like', 'v1:first-secret'));
    other.set('u', '00000000-0000-4000-8000-000000000002');
    expect(verifyUnsubscribe(other, 'v1:first-secret')).toBeNull();
  });

  it('keep working after the secret is rotated, while the old one is still listed', () => {
    const old = unsubscribeUrl(USER, 'comment', 'v1:first-secret');
    expect(verifyUnsubscribe(params(old), 'v1:first-secret,v2:second-secret')).toEqual({
      userKey: USER,
      kind: 'comment',
    });
    expect(params(unsubscribeUrl(USER, 'comment', 'v1:first-secret,v2:second-secret')).get('v')).toBe('v2');
    expect(verifyUnsubscribe(params(old), 'v2:second-secret')).toBeNull();
  });

  it('reject junk', () => {
    expect(verifyUnsubscribe(new URLSearchParams('u=x&k=like&v=v1&t=zz'), 'v1:s')).toBeNull();
  });
});

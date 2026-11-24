import { describe, expect, it } from 'vitest';
import { blogReferrer } from './blogReferrer';

const SITE = 'https://onquest.in';

describe('blogReferrer', () => {
  it('no referrer is none (WhatsApp and Instagram apps often send none)', () => {
    expect(blogReferrer('', SITE)).toBe('none');
  });

  it('names WhatsApp and Instagram', () => {
    expect(blogReferrer('https://web.whatsapp.com/', SITE)).toBe('whatsapp');
    expect(blogReferrer('https://wa.me/', SITE)).toBe('whatsapp');
    expect(blogReferrer('https://l.instagram.com/?u=x', SITE)).toBe('instagram');
  });

  it('OnQuest itself is none, anything else other', () => {
    expect(blogReferrer('https://onquest.in/home', SITE)).toBe('none');
    expect(blogReferrer('https://www.google.com/', SITE)).toBe('other');
    expect(blogReferrer('not a url', SITE)).toBe('other');
    expect(blogReferrer('https://notinstagram.com/', SITE)).toBe('other');
  });
});

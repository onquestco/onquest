import { describe, expect, it } from 'vitest';
import { needsAccount } from './signInPrompt';

describe('needsAccount', () => {
  it('blog app routes need an account, so signed-out taps open the sign-in popup', () => {
    expect(needsAccount('/blogs')).toBe(true);
    expect(needsAccount('/blogs/new')).toBe(true);
    expect(needsAccount('/blogs/11111111-1111-4111-8111-111111111111/edit')).toBe(true);
  });

  it('reading a blog never needs one', () => {
    expect(needsAccount('/@riya/blog/goa-on-15k')).toBe(false);
    expect(needsAccount('/blogsomething')).toBe(false);
  });

  it('keeps the existing pages', () => {
    expect(needsAccount('/quests/new')).toBe(true);
    expect(needsAccount('/create')).toBe(true);
    expect(needsAccount('/@riya/followers')).toBe(true);
    expect(needsAccount('/home')).toBe(false);
    expect(needsAccount('/@riya/goa-trip')).toBe(false);
  });
});

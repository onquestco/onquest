import { describe, expect, it } from 'vitest';
import { buildNotificationEmail } from './content';

const base = {
  url: 'https://onquest.in/@riya/goa',
  unsubscribeUrl: 'https://onquest.in/email/unsubscribe?u=1',
};

describe('buildNotificationEmail', () => {
  it('never names who liked', () => {
    const email = buildNotificationEmail({ ...base, kind: 'like', questTitle: 'Goa trip', actorName: 'Sam' });
    expect(email.subject).toBe('Someone liked your Quest Goa trip');
    expect(email.html.includes('Sam')).toBe(false);
  });

  it('quotes the first 140 characters of a comment, escaped', () => {
    const email = buildNotificationEmail({
      ...base,
      kind: 'comment',
      questTitle: 'Goa trip',
      actorName: 'Meera <script>',
      commentBody: `<b>Hi</b> ${'x'.repeat(200)}`,
    });
    expect(email.html.includes('<script>')).toBe(false);
    expect(email.html.includes('&lt;b&gt;Hi&lt;/b&gt;')).toBe(true);
    expect(email.text).toMatch(/: "<b>Hi<\/b> x+…"/);
    expect(email.text.split('"')[1]?.length).toBe(140);
  });

  it('links to the Quest with ?n=email and has a stop link', () => {
    const email = buildNotificationEmail({ ...base, kind: 'like', questTitle: 'Goa' });
    expect(email.text).toContain('https://onquest.in/@riya/goa?n=email');
    expect(email.text).toContain('Stop emails about likes: https://onquest.in/email/unsubscribe?u=1');
  });
});

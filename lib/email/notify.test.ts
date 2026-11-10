import { beforeEach, describe, expect, it } from 'vitest';
import { notifyByEmail, type NotifyDeps } from './notify';
import type { OutgoingEmail } from './resend';

// Resend is mocked: switches, the budget and what goes out.

const OWNER = '00000000-0000-4000-8000-000000000001';
const SAM = '00000000-0000-4000-8000-000000000002';
let sent: OutgoingEmail[];
let warnings: number;

function deps(overrides: Partial<NotifyDeps> = {}, settings: Record<string, unknown> = {}): NotifyDeps {
  return {
    recipient: async () => ({ email: 'owner@example.com', settings }),
    quest: async () => ({ title: 'Goa trip', url: 'https://onquest.in/@riya/goa' }),
    person: async () => ({ name: 'Sam', url: 'https://onquest.in/@sam' }),
    claimBudget: async () => true,
    overBudget: () => void (warnings += 1),
    send: async (email) => {
      sent.push(email);
      return 'sent';
    },
    ...overrides,
  };
}

beforeEach(() => {
  sent = [];
  warnings = 0;
  process.env.EMAIL_LINK_SECRET = 'v1:test-secret';
});

describe('notifyByEmail', () => {
  it('emails the owner about a like without saying who', async () => {
    expect(
      await notifyByEmail({ kind: 'like', recipientKey: OWNER, actorKey: SAM, tripKey: 'k' }, deps()),
    ).toBe('sent');
    expect(sent[0]?.subject).toBe('Someone liked your Quest Goa trip');
    expect(sent[0]?.html.includes('Sam')).toBe(false);
    expect(sent[0]?.unsubscribeUrl).toContain('/email/unsubscribe?');
  });

  it('respects the switch: the bell still shows it, no email', async () => {
    const off = deps({}, { emailOnComment: false });
    expect(
      await notifyByEmail(
        { kind: 'comment', recipientKey: OWNER, actorKey: SAM, tripKey: 'k', commentBody: 'Hi' },
        off,
      ),
    ).toBe('switched_off');
    expect(sent).toEqual([]);
  });

  it('stops at the daily budget and raises the warning', async () => {
    const full = deps({ claimBudget: async () => false });
    expect(await notifyByEmail({ kind: 'like', recipientKey: OWNER, tripKey: 'k' }, full)).toBe(
      'over_budget',
    );
    expect(sent).toEqual([]);
    expect(warnings).toBe(1);
  });

  it('never throws, even when a lookup fails', async () => {
    const broken = deps({ recipient: async () => Promise.reject(new Error('db down')) });
    expect(await notifyByEmail({ kind: 'like', recipientKey: OWNER, tripKey: 'k' }, broken)).toBe('failed');
  });
});

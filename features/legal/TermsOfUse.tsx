import Link from 'next/link';
import { SUPPORT_EMAIL } from '@/lib/site';
import { LegalList, LegalPage, LegalSection } from './LegalPage';

// The approved text (legal PRD, 11 Nov 2026).
export const TERMS_UPDATED = '11 November 2026';

export function TermsOfUse() {
  return (
    <LegalPage
      page="terms"
      title="Terms of use"
      updated={TERMS_UPDATED}
      short="Your photos and words stay yours; you let us show them the way you choose. Be decent, post only what you have the right to share, and we can remove what breaks these rules. OnQuest is free and provided as it is."
    >
      <LegalSection id="who-can-use" title="Who can use OnQuest">
        <p>You must be 18 or over. One person per account; keep your sign-in to yourself.</p>
      </LegalSection>

      <LegalSection id="your-content" title="Your content">
        <p>
          You own the photos, captions and Quests you post. You give OnQuest a free, worldwide licence to
          store, resize, display and share them only to run the service the way you set it (public, unlisted
          or private, and the Instagram images you export). The licence ends when you delete the content or
          your account, except where someone already saved or shared it.
        </p>
      </LegalSection>

      <LegalSection id="not-allowed" title="What you may not post">
        <LegalList
          items={[
            'Other people’s photos without permission.',
            'Private details about others, such as addresses or phone numbers.',
            'Anything illegal, hateful, threatening or harassing, or anything sexual involving anyone under 18.',
            'Spam or ads.',
            'Anything pretending to be someone else.',
          ]}
        />
      </LegalSection>

      <LegalSection id="comments" title="Comments and follows">
        <p>Be kind in comments. You can delete comments on your own Quests and turn comments off.</p>
      </LegalSection>

      <LegalSection id="what-we-may-do" title="What we may do">
        <p>
          Remove content or close accounts that break these terms, and change or stop features. For serious
          changes we&apos;ll tell you in the app first.
        </p>
      </LegalSection>

      <LegalSection id="usernames" title="Usernames">
        <p>
          Usernames can&apos;t be reused after a change or account deletion, so old links never point to
          someone else.
        </p>
      </LegalSection>

      <LegalSection id="no-guarantees" title="No guarantees">
        <p>
          OnQuest is a free personal project provided “as is”. Keep your own copies of photos that matter. To
          the extent the law allows, the founders aren&apos;t liable for lost content or indirect loss.
        </p>
      </LegalSection>

      <LegalSection id="reporting" title="Reporting">
        <p>
          Email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            {SUPPORT_EMAIL}
          </a>{' '}
          with the link to report a Quest, comment or account.
        </p>
      </LegalSection>

      <LegalSection id="law" title="Law">
        <p>These terms follow the laws of India.</p>
      </LegalSection>

      <LegalSection id="changes" title="Changes">
        <p>
          “Last updated” shows the date; continuing to use OnQuest after a change means you accept it. How we
          handle your data is in our{' '}
          <Link href="/privacy" className="underline">
            Privacy policy
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}

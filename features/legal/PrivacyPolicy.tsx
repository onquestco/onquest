import Link from 'next/link';
import { SUPPORT_EMAIL } from '@/lib/site';
import { LegalList, LegalPage, LegalSection } from './LegalPage';

// The approved text (legal PRD, 11 Nov 2026). Every claim must stay true of the build: if the app
// changes what it collects or who processes it, change this page and its date in the same PR.
export const PRIVACY_UPDATED = '12 November 2026';

const SERVICES = [
  ['Supabase', 'Database, sign-in and photo storage (Singapore)', 'Your account, Quests and photos'],
  ['Vercel', 'Hosting the website', 'Every page request'],
  ['Google', '“Continue with Google”', 'Your sign-in'],
  ['PostHog', 'Usage analytics', 'The events above, without IP address'],
  ['Resend', 'Sending emails', 'Your email address and the message'],
  [
    'Anthropic',
    'Town and caption suggestions',
    'One small collage of your Quest’s photos, with their dates; never your words. Not used to train models',
  ],
  ['OpenStreetMap (Nominatim)', 'Town names', 'A rounded point, sent from our server, not from you'],
];

const email = (
  <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
    {SUPPORT_EMAIL}
  </a>
);

export function PrivacyPolicy() {
  return (
    <LegalPage
      page="privacy"
      title="Privacy policy"
      updated={PRIVACY_UPDATED}
      short="We keep what you need to make and share Quests, and nothing more. We never store your exact photo location, never sell your data and show no ads. You decide who sees each Quest, and you can delete everything at any time."
    >
      <LegalSection id="who-we-are" title="Who we are">
        <p>
          OnQuest (onquest.in) is a personal project run by its founders in India; it is not yet a registered
          company. For anything about your data, email {email}. This address is also our grievance contact
          under India&apos;s Digital Personal Data Protection Act.
        </p>
      </LegalSection>

      <LegalSection id="what-we-collect" title="What we collect">
        <LegalList
          items={[
            'From Google when you sign in with Google: your name, email address and profile photo link. With an email link: your email address.',
            'What you add: your name, username, home city, bio and profile photo; your Quests, photos, captions, places and the template you pick; likes, comments and who you follow.',
            'From your photos: the date taken, and the town it was taken in. When you create a Quest, a small collage of its photos is sent to Anthropic to suggest the town (if your phone didn’t share it) and short captions; we don’t keep the collage. Location is read on your phone, rounded to about 1 km before it leaves it, and used only to find the town name. We store the town and its centre, never where the photo was taken. Every photo is re-saved on your phone before upload, which removes the hidden details cameras add (GPS, camera model and so on).',
            'How the app is used: pages opened and actions such as “Quest published”, with a random ID kept in your browser’s storage and the type of device and browser. We tell our analytics provider to discard IP addresses. We never record what you type, your email or your photo links in analytics.',
            'Emails: whether an email was sent to you, so we don’t send too many.',
          ]}
        />
      </LegalSection>

      <LegalSection id="how-we-use-it" title="How we use it">
        <p>
          To run your account and show your Quests and profile; to send the emails you have switched on
          (likes, comments, follows), each with an unsubscribe link; to suggest the town and short captions;
          to count views and understand which features work; to keep OnQuest safe (rate limits, removing
          abuse). We don&apos;t sell your data, show ads or build advertising profiles.
        </p>
      </LegalSection>

      <LegalSection id="who-sees-what" title="Who sees what">
        <LegalList
          items={[
            'Public Quests: anyone, on your profile, in search and on Explore.',
            'Unlisted Quests: anyone with the link; never on your profile or in search.',
            'Private Quests and drafts: only you.',
            'Your profile (name, username, city, bio, photo, public Quests, places, follower counts) is public. You can hide places in Settings.',
            'View counts are seen only by the OnQuest team, never by other people.',
          ]}
        />
      </LegalSection>

      <LegalSection id="services" title="Services that process data for us">
        <ul className="flex flex-col gap-3">
          {SERVICES.map(([name, purpose, gets]) => (
            <li key={name} className="rounded-lg border border-line p-3">
              <p className="font-semibold">{name}</p>
              <p className="text-ink-muted">{purpose}</p>
              <p>Gets: {gets}</p>
            </li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection id="how-long" title="How long we keep it">
        <p>
          As long as your account exists. When you change something, the earlier version is kept for up to 180
          days so we can recover from mistakes, then deleted (90 days for likes, comments and follows).
          Notifications are deleted after a year.
        </p>
      </LegalSection>

      <LegalSection id="deleting" title="Deleting">
        <p>
          Delete a Quest from its menu, or your whole account in Settings → Delete account. Account deletion
          removes your profile, Quests, photos, likes, comments and follows straight away; your sign-in record
          goes within a day. Your old username stays reserved so nobody else can take over your old links.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="Your rights">
        <p>
          You can see and correct your data, delete it, ask for a copy, or complain. Editing and deleting are
          in the app; for a copy or anything else, email {email} and we&apos;ll reply within 30 days.
        </p>
      </LegalSection>

      <LegalSection id="age" title="Age">
        <p>
          OnQuest is for people 18 and over. If you believe someone younger has an account, email us and
          we&apos;ll remove it.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies and storage">
        <p>
          We use only the cookies needed to keep you signed in, plus the random analytics ID in your
          browser&apos;s storage. No advertising or third-party tracking cookies.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes">
        <p>
          If this policy changes in a way that matters, we&apos;ll show a notice in the app before it applies.
          “Last updated” shows the date. See also our{' '}
          <Link href="/terms" className="underline">
            Terms of use
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}

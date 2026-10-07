import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/otw';
import styles from './privacy.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy · OTW',
  description: 'What OTW stores, why, and how to remove it.',
};

const UPDATED = 'October 7, 2026';
/** Set NEXT_PUBLIC_CONTACT_EMAIL on Vercel; without it the page asks people to reach the team another way. */
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '';

/** Public privacy policy (also the "Privacy policy link" on Google's OAuth consent screen). */
export default function PrivacyPage() {
  return (
    <main className={`bg-blossom ${styles.page}`}>
      <Link className={`btn sm cream ${styles.back}`} href="/">
        <Icon name="back" size={18} /> Back to OTW
      </Link>

      <article className={styles.card}>
        <header className={styles.head}>
          <span className={styles.badge}>
            <Icon name="lock" size={18} /> Privacy
          </span>
          <h1>Privacy Policy</h1>
          <p className={styles.updated}>Last updated: {UPDATED}</p>
          <p>
            OTW (On The Water) is a student project for planning galas and trips with friends. This page explains what we
            keep, why we keep it, and how to remove it. Short version: we only store what the app needs to work, and we
            never sell it or use it for ads.
          </p>
        </header>

        <section>
          <h2>What we store</h2>
          <ul>
            <li>
              <b>Your account:</b> your email, the name you sign up with, and a hashed password, handled by Supabase
              Auth. We never see your password.
            </li>
            <li>
              <b>Gala details:</b> titles, dates, destination, the nicknames of people in each gala, RSVPs (I&apos;m G,
              Maybe, Can&apos;t make it), the plan, checklist, budget, expenses, and chat messages.
            </li>
            <li>
              <b>Live location (Saan Tayo?):</b> only while you turn sharing on, only visible to people in that gala, and
              removed when sharing stops or the gala ends.
            </li>
            <li>
              <b>Photos and videos (Gala Dump):</b> stored in a Google Drive folder that belongs to the OTW project, one
              folder per gala. Anyone with a file&apos;s link can view it, so only upload what your group is okay
              sharing.
            </li>
          </ul>
        </section>

        <section>
          <h2>How we use it</h2>
          <p>
            Only to run OTW: showing your galas, keeping everyone in a gala in sync, splitting expenses, and sending
            account emails like the sign-up confirmation. No ads, no tracking across other sites, no selling or renting
            of data.
          </p>
        </section>

        <section>
          <h2>Google Drive</h2>
          <p>
            OTW uses the Google Drive API to create a folder for each gala and to store the photos and videos members
            upload, in the OTW project&apos;s own Drive. Members never sign in to Google and OTW never reads anyone
            else&apos;s Drive. OTW&apos;s use of information received from Google APIs follows the{' '}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </section>

        <section>
          <h2>Services that help run OTW</h2>
          <ul>
            <li>
              <b>Supabase:</b> database, accounts and live updates
            </li>
            <li>
              <b>Railway</b> and <b>Vercel:</b> hosting for the app
            </li>
            <li>
              <b>Upstash:</b> short-lived cache and rate limits (no permanent data)
            </li>
            <li>
              <b>Google Drive:</b> Gala Dump photos and videos
            </li>
            <li>
              <b>Email provider:</b> account emails such as the sign-up confirmation
            </li>
          </ul>
        </section>

        <section>
          <h2>Keeping it safe</h2>
          <p>
            Every request needs a signed-in account, and you can only see galas you&apos;re a member of. Gala Passwords
            are stored hashed, and connections are encrypted (HTTPS).
          </p>
        </section>

        <section>
          <h2>Removing your data</h2>
          <ul>
            <li>Leave a gala anytime from its Settings. A Gala Leader can also delete the whole gala there.</li>
            <li>Delete a photo or video you uploaded from the Gala Dump. It goes to the Drive trash right away.</li>
            <li>
              To delete your account and everything linked to it,{' '}
              {CONTACT ? (
                <>
                  email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
                </>
              ) : (
                'contact the OTW project team'
              )}
              . We&apos;ll remove it within 30 days.
            </li>
          </ul>
        </section>

        <section>
          <h2>Changes</h2>
          <p>
            If this policy changes, we&apos;ll update the date at the top of this page.
            {CONTACT && (
              <>
                {' '}
                Questions? Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
              </>
            )}
          </p>
        </section>
      </article>
    </main>
  );
}

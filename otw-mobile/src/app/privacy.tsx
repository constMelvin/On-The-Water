import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Screen, Tag } from '@/components/ui';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';

/** Privacy Policy (same text as otw-client/src/app/privacy/page.tsx). Open signed in or not. */
const UPDATED = 'October 7, 2026';
/** Set EXPO_PUBLIC_CONTACT_EMAIL to show an address; without it the page asks people to reach the team another way. */
const CONTACT = process.env.EXPO_PUBLIC_CONTACT_EMAIL ?? '';

function H2({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <Text style={[styles.h2, { color: colors.text }]}>{children}</Text>;
}

function P({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <Text style={[styles.p, { color: colors.text }]}>{children}</Text>;
}

function Li({ b, children }: { b?: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.li}>
      <Text style={[styles.dot, { color: colors.rosyInk }]}>•</Text>
      <Text style={[styles.p, styles.flex, { color: colors.text }]}>
        {b ? <Text style={styles.b}>{b} </Text> : null}
        {children}
      </Text>
    </View>
  );
}

const B = ({ children }: { children: ReactNode }) => <Text style={styles.b}>{children}</Text>;

export default function Privacy() {
  const { colors } = useTheme();
  return (
    <Screen section="blossom">
      <Button sm fw={false} variant="cream" icon="back" label="Back to OTW" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <Card style={styles.card}>
        <Tag icon="lock">Privacy</Tag>
        <Text style={[styles.h1, { color: colors.text }]}>Privacy Policy</Text>
        <Text style={[styles.updated, { color: colors.text }]}>Last updated {UPDATED}</Text>
        <P>
          OTW (On The Water) is a student project for planning galas and trips with friends. This page explains what we keep, why we keep it, and how to remove
          it. Short version: we only store what the app needs to work, and we never sell it or use it for ads.
        </P>

        <H2>What we store</H2>
        <Li b="Your account:">your email, the name you sign up with, and a hashed password, handled by Supabase Auth. We never see your password.</Li>
        <Li b="Gala details:">
          titles, dates, destination, the nicknames of people in each gala, RSVPs (I&apos;m G, Maybe, Can&apos;t make it), the plan, checklist, budget,
          expenses, and chat messages.
        </Li>
        <Li b="Live location (Saan Tayo?):">only while you turn sharing on, only visible to people in that gala, and removed when sharing stops or the gala ends.</Li>
        <Li b="Photos and videos (Gala Dump):">
          stored in a Google Drive folder that belongs to the OTW project, one folder per gala. Anyone with a file&apos;s link can view it, so only upload
          what your group is okay sharing.
        </Li>

        <H2>How we use it</H2>
        <P>
          Only to run OTW: showing your galas, keeping everyone in a gala in sync, splitting expenses, and sending account emails like the sign-up
          confirmation. No ads, no tracking across other sites, no selling or renting of data.
        </P>

        <H2>Google Drive</H2>
        <P>
          OTW uses the Google Drive API to create a folder for each gala and to store the photos and videos members upload, in the OTW project&apos;s own
          Drive. Members never sign in to Google and OTW never reads anyone else&apos;s Drive. OTW&apos;s use of information received from Google APIs
          follows the{' '}
          <Text style={styles.lnk} onPress={() => void WebBrowser.openBrowserAsync('https://developers.google.com/terms/api-services-user-data-policy')}>
            Google API Services User Data Policy
          </Text>
          , including the Limited Use requirements.
        </P>

        <H2>Services that help run OTW</H2>
        <Li b="Supabase:">database, accounts and live updates</Li>
        <Li>
          <B>Railway</B> and <B>Vercel:</B> hosting for the app
        </Li>
        <Li b="Upstash:">short-lived cache and rate limits (no permanent data)</Li>
        <Li b="Google Drive:">Gala Dump photos and videos</Li>
        <Li b="Email provider:">account emails such as the sign-up confirmation</Li>

        <H2>Keeping it safe</H2>
        <P>
          Every request needs a signed-in account, and you can only see galas you&apos;re a member of. Gala Passwords are stored hashed, and connections are
          encrypted (HTTPS).
        </P>

        <H2>Removing your data</H2>
        <Li>Leave a gala anytime from its Settings. A Gala Leader can also delete the whole gala there.</Li>
        <Li>Delete a photo or video you uploaded from the Gala Dump. It goes to the Drive trash right away.</Li>
        <Li>To delete your account and everything linked to it, {CONTACT ? `email ${CONTACT}` : 'contact the OTW project team'}. We&apos;ll remove it within 30 days.</Li>

        <H2>Changes</H2>
        <P>
          If this policy changes, we&apos;ll update the date at the top of this page.
          {CONTACT ? ` Questions? Email ${CONTACT}.` : ''}
        </P>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: 10 },
  h1: { fontFamily: font.display, fontSize: 34 },
  updated: { fontFamily: font.bodyBold, fontSize: 13, opacity: 0.8 },
  h2: { fontFamily: font.displaySemi, fontSize: 21, marginTop: 8 },
  p: { fontFamily: font.body, fontSize: 15, lineHeight: 22 },
  b: { fontFamily: font.bodyHeavy },
  li: { flexDirection: 'row', gap: 8 },
  dot: { fontFamily: font.bodyHeavy, fontSize: 15, lineHeight: 22 },
  lnk: { fontFamily: font.bodyHeavy, textDecorationLine: 'underline' },
});

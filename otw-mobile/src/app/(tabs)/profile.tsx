import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { api, signOut } from '@/api/client';
import type { ProfileDto } from '@/api/types';
import { Avatar, isTone, TONE_COLORS, TONES, type Tone } from '@/components/Avatar';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Icon } from '@/components/Icon';
import { Button, Card, ErrorNote, Field, Fine, Loading, PageHead, Screen, SegmentedControl, Tag } from '@/components/ui';
import { PhotoError, pickProfilePhoto, profilePhotoUrl, uploadProfilePhoto } from '@/lib/profile-photo';
import { supabase } from '@/lib/supabase';
import { font } from '@/theme/fonts';
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider';

const NICKNAME_MAX = 20;
const STATUS_MAX = 40;
const TONE_LABEL: Record<Tone, string> = { rosy: 'Rosy', teal: 'Teal', zest: 'Zest', blossom: 'Blossom' };
/** The colour's "vibe" (same copy as the web ProfilePreview). */
const VIBE: Record<Tone, string> = { rosy: 'Main character', teal: 'Chill lang', zest: 'Masaya vibes', blossom: 'Malambing' };

/** Profile: photo, nickname, avatar colour, status and theme (port of otw-client/src/app/me/profile/page.tsx). */
export default function Profile() {
  const profile = useQuery({ queryKey: ['me', 'profile'], queryFn: () => api<ProfileDto>('/me/profile') });
  const account = useQuery({
    queryKey: ['me', 'account'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const name = data.user?.user_metadata?.name;
      return { name: typeof name === 'string' ? name : '', email: data.user?.email ?? '' };
    },
  });
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <Screen>
      <PageHead title="Your profile" sub="Make it yours. Konting glow-up lang." tag={<Tag icon="user">Profile</Tag>} />
      {profile.isPending || account.isPending ? <Loading label="Loading your profile" /> : null}
      <ErrorNote message={profile.error?.message} />
      {profile.data && account.data ? <ProfileEditor saved={profile.data} accountName={account.data.name} /> : null}
      {account.data?.email ? <Fine>Signed in as {account.data.email}</Fine> : null}
      <Button variant="cream" icon="logout" label="Log out" onPress={() => setConfirmLogout(true)} />
      <Text accessibilityRole="link" onPress={() => router.push('/privacy')} style={styles.privacy}>
        Privacy Policy
      </Text>
      {confirmLogout ? (
        <ConfirmSheet
          title="Log out of OTW?"
          body="Your galas stay saved. Log in again to see them."
          confirm="Log out"
          onClose={() => setConfirmLogout(false)}
          onConfirm={() => signOut()}
        />
      ) : null}
    </Screen>
  );
}

function ProfileEditor({ saved, accountName }: { saved: ProfileDto; accountName: string }) {
  const { colors, mode, setMode } = useTheme();
  const qc = useQueryClient();
  const [nickname, setNickname] = useState(saved.nickname);
  const [status, setStatus] = useState(saved.status);
  const [color, setColor] = useState<Tone>(isTone(saved.color) ? saved.color : 'rosy');
  // A colour is only saved once the person picked one (or already had one saved).
  const [colorPicked, setColorPicked] = useState(isTone(saved.color));
  const [photoFileId, setPhotoFileId] = useState(saved.photoDriveFileId);
  /** A newly picked photo (local file) that goes up to Drive on Save. */
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [popKey, setPopKey] = useState(0);
  const photo = newPhoto ?? profilePhotoUrl(photoFileId);
  const shownName = nickname.trim() || accountName || '?';

  const save = useMutation({
    mutationFn: async () => {
      const fileId = newPhoto ? await uploadProfilePhoto(newPhoto) : photoFileId;
      return api<ProfileDto>('/me/profile', {
        method: 'PUT',
        body: { nickname: nickname.trim(), status: status.trim(), color: colorPicked ? color : null, photoDriveFileId: fileId ?? null },
      });
    },
    onSuccess: (next) => {
      qc.setQueryData(['me', 'profile'], next);
      setPhotoFileId(next.photoDriveFileId);
      setNewPhoto(null);
      setPopKey((k) => k + 1);
    },
  });

  const pick = async () => {
    setError('');
    try {
      const uri = await pickProfilePhoto();
      if (uri) setNewPhoto(uri);
    } catch (e) {
      setError(e instanceof PhotoError ? e.message : 'Hindi mabasa ‘yang photo. Try another one.');
    }
  };

  const busy = save.isPending;
  const t = TONE_COLORS[color];

  return (
    <>
      {/* Ganito ka makita ng GC: live preview of what's being edited */}
      <Animated.View key={popKey} entering={popKey ? ZoomIn.springify() : undefined}>
        <Card shadow={t.sh} style={styles.preview}>
          <Text style={[styles.kicker, { color: colors.text }]}>Ganito ka makita ng GC</Text>
          <Avatar name={shownName} tone={color} photo={photo} size={116} />
          <Text style={[styles.pname, { color: colors.text }]}>{shownName}</Text>
          <Tag variant={color} icon="sparkle">
            {VIBE[color]}
          </Tag>
          <View style={[styles.bubble, { backgroundColor: colors.surface2 }]}>
            <Text style={[styles.bubbleText, { color: colors.text, opacity: status.trim() ? 1 : 0.6 }]}>
              {status.trim() || 'Always late pero sumusipot'}
            </Text>
          </View>
        </Card>
      </Animated.View>

      <Card style={styles.card}>
        {/* ---- your look ---- */}
        <View style={styles.sec}>
          <Text style={[styles.st, { color: colors.text }]}>Your look</Text>
          <View style={styles.photoRow}>
            <View>
              <Avatar name={shownName} tone={color} photo={photo} size={88} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={photo ? 'Change photo' : 'Add a photo'}
                disabled={busy}
                onPress={() => void pick()}
                style={[styles.cam, { borderColor: colors.surface }]}>
                <Icon name="camera" size={18} color={TONE_COLORS.rosy.fg} />
              </Pressable>
            </View>
            <View style={styles.photoBtns}>
              <Button sm fw={false} variant="teal" icon="upload" label={photo ? 'Change photo' : 'Upload a photo'} disabled={busy} onPress={() => void pick()} />
              {photo ? (
                <Button
                  sm
                  fw={false}
                  variant="ghost"
                  label="Remove photo"
                  disabled={busy}
                  onPress={() => {
                    setNewPhoto(null);
                    setPhotoFileId(null);
                  }}
                />
              ) : null}
            </View>
          </View>
          {error ? <Text style={[styles.err, { color: colors.rosyInk }]}>{error}</Text> : null}

          <Text style={[styles.label, { color: colors.text }]}>Avatar color</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Avatar color" style={styles.swatches}>
            {TONES.map((tone) => {
              const on = color === tone;
              const c = TONE_COLORS[tone];
              return (
                <Pressable
                  key={tone}
                  accessibilityRole="radio"
                  accessibilityLabel={TONE_LABEL[tone]}
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    setColor(tone);
                    setColorPicked(true);
                  }}
                  style={[styles.swRing, { borderColor: on ? colors.focus : 'transparent' }]}>
                  <View style={[styles.sw, { backgroundColor: c.bg, borderColor: colors.surface, borderBottomColor: c.sh }]}>
                    {on ? <Icon name="check" size={18} color={c.fg} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ---- about you ---- */}
        <View style={[styles.sec, styles.secRule, { borderTopColor: colors.line }]}>
          <Text style={[styles.st, { color: colors.text }]}>About you</Text>
          <Field label="Nickname" value={nickname} onChangeText={setNickname} maxLength={NICKNAME_MAX} placeholder={accountName || 'Ano’ng itatawag sa’yo?'} />
          <Field label="Status (optional)" value={status} onChangeText={setStatus} maxLength={STATUS_MAX} placeholder="Always late pero sumusipot" />
          <Text style={[styles.counter, { color: colors.text }]}>
            {status.length}/{STATUS_MAX}
          </Text>
        </View>

        {/* ---- theme ---- */}
        <View style={[styles.sec, styles.secRule, { borderTopColor: colors.line }]}>
          <Text style={[styles.st, { color: colors.text }]}>Theme</Text>
          <SegmentedControl<ThemeMode>
            label="Theme"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'light', label: 'Light', icon: 'sun' },
              { value: 'dark', label: 'Dark', icon: 'moon' },
            ]}
          />
          <Fine>Auto follows your phone. It applies right away and is remembered on this phone.</Fine>
        </View>

        <Fine>
          Saved to your account, so it follows you to other devices. To change your name inside a gala, use that gala&apos;s
          Settings.
        </Fine>
        <ErrorNote message={save.error ? (save.error instanceof Error ? save.error.message : 'Couldn’t save your profile.') : null} />
        <Button variant="zest" icon="check" label={save.isSuccess && !busy ? 'Saved!' : 'Save'} busy={busy} onPress={() => save.mutate()} />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  privacy: { fontFamily: font.bodyHeavy, fontSize: 14, textDecorationLine: 'underline', textAlign: 'center', opacity: 0.8 },
  preview: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  kicker: { fontFamily: font.bodyHeavy, fontSize: 14, opacity: 0.85 },
  pname: { fontFamily: font.displaySemi, fontSize: 26 },
  bubble: { borderRadius: 18, borderBottomLeftRadius: 6, paddingVertical: 10, paddingHorizontal: 16, maxWidth: '90%' },
  bubbleText: { fontFamily: font.bodyBold, fontSize: 15, textAlign: 'center' },

  card: { gap: 20 },
  sec: { gap: 14 },
  secRule: { paddingTop: 20, borderTopWidth: 3, borderStyle: 'dashed' },
  st: { fontFamily: font.displaySemi, fontSize: 20 },
  label: { fontFamily: font.bodyHeavy, fontSize: 15 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap' },
  photoBtns: { gap: 4, alignItems: 'flex-start' },
  cam: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    backgroundColor: TONE_COLORS.rosy.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  err: { fontFamily: font.bodyHeavy, fontSize: 15 },
  swatches: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  swRing: { borderWidth: 4, borderRadius: 999, padding: 3 },
  sw: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderBottomWidth: 6, alignItems: 'center', justifyContent: 'center' },
  counter: { alignSelf: 'flex-end', fontFamily: font.bodyBold, fontSize: 13, opacity: 0.75, marginTop: -8 },
});

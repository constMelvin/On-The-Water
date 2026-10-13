import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { api } from '@/api/client';
import { createRoom } from '@/api/galas';
import type { ProfileDto } from '@/api/types';
import { Icon, type IconName } from '@/components/Icon';
import { LocationField } from '@/components/LocationField';
import { PickerField } from '@/components/PickerField';
import { PW_KEY } from '@/components/gala/Settings';
import { kv } from '@/lib/otw/kv';
import { Button, Screen } from '@/components/ui';
import { displayCode } from '@/lib/rooms';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

/**
 * Plan a Gala (port of otw-client/src/app/plan/page.tsx): one create screen on rosy, then the celebration with the
 * Gala Code and Password to share. Everything POST /rooms stores is collected here; the leader can edit it in Settings.
 */
const NICKNAME_MAX = 40;
const NAME_MIN = 2;
const NAME_MAX = 40;
const DESTINATION_MAX = 150;
const MEETING_MAX = 255;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

const PRESETS: { label: string; icon: IconName }[] = [
  { label: "Hindi 'to Drawing", icon: 'sparkle' },
  { label: 'Biglaang Coffee Run', icon: 'coffee' },
  { label: 'Siargao 2026, manifesting', icon: 'sparkle' },
  { label: 'Beach Day', icon: 'sun' },
  { label: 'Birthday Gala', icon: 'burst' },
  { label: 'Graduation Trip', icon: 'cap' },
];

const VIBES = ['chaotic', 'chill', 'mom-friend', 'hype', 'late king/queen'];

const startOfToday = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

export default function PlanAGala() {
  const { colors } = useTheme();
  const [stage, setStage] = useState<'create' | 'done'>('create');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  // Couple Mode's "Start Couple Mode" opens this with ?type=couple (same as the web).
  const { type } = useLocalSearchParams<{ type?: string }>();
  const [galaType, setGalaType] = useState<'GROUP' | 'COUPLE'>(type === 'couple' ? 'COUPLE' : 'GROUP');
  const [nickname, setNickname] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationPin, setDestinationPin] = useState<{ lat: number; lng: number } | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [meetingLabel, setMeetingLabel] = useState('');
  const [detailsError, setDetailsError] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [vibe, setVibe] = useState('chill');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ id: string; code: string; title: string; password: string } | null>(null);
  const [toast, setToast] = useState('');

  // Start the nickname from the saved profile nickname (until the person types their own).
  const profile = useQuery({ queryKey: ['me', 'profile'], queryFn: () => api<ProfileDto>('/me/profile') });
  const auto = useRef('');
  useEffect(() => {
    const want = (profile.data?.nickname ?? '').slice(0, NICKNAME_MAX);
    if (!want) return;
    const prev = auto.current;
    auto.current = want;
    setNickname((n) => (n === '' || n === prev ? want : n));
  }, [profile.data?.nickname]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const create = async () => {
    if (submitting) return;
    const title = name.trim();
    if (title.length < NAME_MIN || title.length > NAME_MAX) return setError('Give your gala a name (at least 2 characters).');
    setError('');
    const problem = !nickname.trim()
      ? 'Add your nickname for this gala.'
      : !destination.trim()
        ? 'Where are you going? Add a destination.'
        : !startDate
          ? 'Pick the start date.'
          : endDate && endDate < startDate
            ? "The end date can't be before the start date."
            : endTime && !startTime
              ? 'Add a start time too, or clear the end time.'
              : (!endDate || endDate === startDate) && startTime && endTime && endTime < startTime
                ? "The end time can't be before the start time."
                : '';
    if (problem) return setDetailsError(problem);
    setDetailsError('');
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      return setPasswordError(`Set a Gala Password (${PASSWORD_MIN} to ${PASSWORD_MAX} characters).`);
    }
    setPasswordError('');
    setSubmitting(true);
    try {
      const room = await createRoom({
        title,
        nickname: nickname.trim().slice(0, NICKNAME_MAX),
        startDate,
        ...(endDate && { endDate }),
        ...(startTime && { startTime }),
        ...(startTime && endTime && { endTime }),
        destination: destination.trim(),
        ...(destinationPin && { destinationLat: destinationPin.lat, destinationLng: destinationPin.lng }),
        ...(meetingLabel.trim() && { meetingLabel: meetingLabel.trim() }),
        password,
        type: galaType,
      });
      // Settings shows it to the leader on this phone (the web keeps it in sessionStorage).
      kv.setItem(PW_KEY, password);
      setCreated({ id: room.id, code: displayCode(room.roomCode), title: room.title || title, password });
      setStage('done');
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Couldn't create the gala. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const shareMsg = created ? `G tayo? Join our gala "${created.title}". Code: ${created.code}` : '';
  const copy = async (text: string, ok: string) => {
    await Clipboard.setStringAsync(text);
    setToast(ok);
  };

  return (
    <Screen section="rosy" style={styles.page}>
      <View style={styles.topBar}>
        <View style={styles.wordmark}>
          <Icon name="pin" size={26} color={brand.zest} />
          <Text style={styles.wordmarkText}>OTW</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={() => router.back()} style={styles.close}>
          <Icon name="x" size={20} color={brand.cream} />
        </Pressable>
      </View>

      {stage === 'create' ? (
        <>
          <View>
            <Text style={styles.heading}>Anong gala &apos;to?</Text>
            <Text style={styles.sub}>Pangalanan mo, tapos ilapag na sa GC.</Text>
          </View>

          <PlanInput
            big
            value={name}
            onChangeText={(v) => {
              setName(v);
              setError('');
            }}
            maxLength={NAME_MAX}
            placeholder="Baguio Before Graduation"
            accessibilityLabel="Gala name"
            bad={!!error}
          />
          {error ? <Text style={[styles.error, { backgroundColor: colors.surface, color: colors.rosyInk }]}>{error}</Text> : null}

          <View style={styles.chips}>
            {PRESETS.map((p) => {
              const on = name === p.label;
              return (
                <Pressable
                  key={p.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    setName(p.label);
                    setError('');
                  }}
                  style={[styles.preset, on ? styles.presetOn : { backgroundColor: colors.surface, borderColor: colors.line }]}>
                  <Icon name={p.icon} size={15} color={on ? brand.tealDark : brand.rosy} />
                  <Text style={[styles.presetText, { color: on ? brand.tealDark : colors.text }]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.details}>
            <View style={styles.chips}>
              {(
                [
                  ['GROUP', 'Barkada gala'],
                  ['COUPLE', 'Couple gala (2 lang)'],
                ] as const
              ).map(([k, l]) => (
                <VibeChip key={k} label={l} on={galaType === k} onPress={() => setGalaType(k)} />
              ))}
            </View>

            <PlanField label="Your nickname">
              <PlanInput value={nickname} onChangeText={setNickname} maxLength={NICKNAME_MAX} placeholder="Ano tawag sa'yo ng tropa?" />
            </PlanField>
            <View style={[styles.locCard, { backgroundColor: colors.surface }]}>
              <LocationField
                label="Destination"
                value={destination}
                maxLength={DESTINATION_MAX}
                placeholder="Search a place, e.g. Baguio City"
                onChange={(v, coords) => {
                  setDestination(v);
                  setDestinationPin(coords ?? null);
                  setDetailsError('');
                }}
              />
            </View>
            <View style={styles.row}>
              <PickerField
                label="Start date"
                mode="date"
                value={startDate}
                minimumDate={startOfToday()}
                placeholder="Pick a day"
                onChange={(v) => {
                  setStartDate(v);
                  if (endDate && v && endDate < v) setEndDate('');
                  setDetailsError('');
                }}
              />
              <PickerField
                label="End date"
                mode="date"
                value={endDate}
                minimumDate={startDate ? new Date(`${startDate}T00:00:00`) : startOfToday()}
                placeholder="Same day"
                onChange={(v) => {
                  setEndDate(v);
                  setDetailsError('');
                }}
              />
            </View>
            <View style={styles.row}>
              <PickerField label="Start time (optional)" mode="time" value={startTime} placeholder="--:--" onChange={setStartTime} />
              <PickerField label="End time (optional)" mode="time" value={endTime} placeholder="--:--" onChange={setEndTime} />
            </View>
            <PlanField label="Meeting place (optional)">
              <PlanInput value={meetingLabel} onChangeText={setMeetingLabel} maxLength={MEETING_MAX} placeholder="Cubao bus terminal, Gate 2" />
            </PlanField>
            {detailsError ? <Text style={[styles.error, { backgroundColor: colors.surface, color: colors.rosyInk }]}>{detailsError}</Text> : null}
          </View>

          <PlanField label="Gala Password">
            <View>
              <PlanInput
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setPasswordError('');
                }}
                maxLength={PASSWORD_MAX}
                placeholder="Para sa barkada lang"
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                bad={!!passwordError}
                padRight
              />
              <Pressable accessibilityRole="button" accessibilityState={{ selected: showPassword }} onPress={() => setShowPassword((v) => !v)} style={styles.pwToggle}>
                <Text style={[styles.pwToggleText, { color: colors.text }]}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
            {passwordError ? (
              <Text style={[styles.error, { backgroundColor: colors.surface, color: colors.rosyInk }]}>{passwordError}</Text>
            ) : (
              <Text style={styles.hint}>
                {PASSWORD_MIN} to {PASSWORD_MAX} characters. Everyone needs it to join, so share it with your barkada.
              </Text>
            )}
          </PlanField>

          <View style={styles.divider} />

          <View style={{ gap: 12 }}>
            <Text style={styles.label}>Ikaw ang nag-organize. Anong vibe mo?</Text>
            <View style={styles.vibeRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(nickname.trim()[0] ?? '?').toUpperCase()}</Text>
              </View>
              <View style={[styles.chips, styles.flex]}>
                {VIBES.map((v) => (
                  <VibeChip key={v} label={v} on={vibe === v} onPress={() => setVibe(v)} />
                ))}
              </View>
            </View>
            <Text style={styles.hint}>{nickname.trim() || 'Ikaw'} · tap para palitan ang vibe</Text>
          </View>

          <Button variant="zest" label={submitting ? 'Sandali lang...' : 'G na agad!'} busy={submitting} onPress={() => void create()} />
          <Text style={styles.reassure}>Pwede pang baguhin lahat sa Settings mamaya.</Text>
        </>
      ) : created ? (
        <View style={styles.done}>
          <Animated.View entering={ZoomIn.springify()} style={styles.blob}>
            <Icon name="burst" size={44} color={brand.rosy} />
          </Animated.View>
          <Text style={[styles.heading, styles.headingSm]}>Ayan. Hindi na &apos;to Drawing.</Text>
          <Text style={styles.sub}>Ilapag mo na &apos;to sa GC bago mag-isip ulit.</Text>

          <Ticket label="Gala Code" value={created.code} onCopy={() => void copy(created.code, 'Nakopya na. Ilapag mo na sa GC.')} />
          <Ticket label="Gala Password" value={created.password} onCopy={() => void copy(created.password, 'Nakopya ang password.')} />

          <View style={styles.row}>
            <View style={styles.flex}>
              <Button sm variant="cream" icon="copy" label="Kopyahin ang invite" onPress={() => void copy(shareMsg, 'Nakopya ang invite. Paste mo sa GC.')} />
            </View>
            <View style={styles.flex}>
              <Button sm variant="teal" icon="share" label="I-share" onPress={() => void Share.share({ message: shareMsg })} />
            </View>
          </View>
          <Text style={styles.message}>&ldquo;{shareMsg}&rdquo;</Text>
          <Button
            variant="zest"
            icon="arrowr"
            label="Pumasok sa gala"
            onPress={() => router.replace({ pathname: '/gala/[roomId]', params: { roomId: created.id } })}
          />
        </View>
      ) : null}

      {toast ? (
        <Animated.View entering={FadeIn} style={[styles.toast, { backgroundColor: colors.surface }]} accessibilityLiveRegion="polite">
          <Icon name="check" size={18} color={colors.text} />
          <Text style={[styles.toastText, { color: colors.text }]}>{toast}</Text>
        </Animated.View>
      ) : null}
    </Screen>
  );
}

function PlanField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

/** .input / .inputSm: field-bg fill, rosy-dark 5-6px solid shadow. */
function PlanInput({ big, bad, padRight, ...props }: TextInputProps & { big?: boolean; bad?: boolean; padRight?: boolean }) {
  const { colors } = useTheme();
  const depth = big ? 6 : 5;
  const radius = big ? 22 : 18;
  return (
    <View style={{ paddingBottom: depth }}>
      <View style={[styles.inShadow, { top: depth, borderRadius: radius }]} />
      <TextInput
        autoCorrect={false}
        placeholderTextColor={colors.text + '80'}
        {...props}
        style={[
          big ? styles.inputBig : styles.input,
          { borderRadius: radius, backgroundColor: colors.fieldBg, color: colors.text, borderColor: bad ? brand.rosyDark : colors.fieldBg },
          padRight && { paddingRight: 76 },
        ]}
      />
    </View>
  );
}

function VibeChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={[styles.vibe, on && styles.vibeOn]}>
      <Text style={styles.vibeText}>{label}</Text>
    </Pressable>
  );
}

function Ticket({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.ticketWrap}>
      <View style={styles.ticketShadow} />
      <View style={[styles.ticket, { backgroundColor: colors.surface }]}>
        <View style={styles.flex}>
          <Text style={[styles.ticketLabel, { color: colors.text }]}>{label}</Text>
          <Text style={styles.code} selectable>
            {value}
          </Text>
        </View>
        <Button sm fw={false} variant="zest" icon="copy" label="Copy" accessibilityLabel={`Copy ${label}`} onPress={onCopy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { gap: 18, paddingBottom: 48 },
  row: { flexDirection: 'row', gap: 12 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wordmarkText: { fontFamily: font.display, fontSize: 26, color: brand.cream },
  close: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: 'rgba(255,248,242,0.55)', alignItems: 'center', justifyContent: 'center' },

  heading: { fontFamily: font.displaySemi, fontSize: 38, lineHeight: 40, letterSpacing: -0.7, color: brand.cream, marginTop: 6 },
  headingSm: { fontSize: 32, lineHeight: 35, textAlign: 'center' },
  sub: { fontFamily: font.bodyBold, fontSize: 19, lineHeight: 26, color: brand.cream, marginTop: 8 },
  label: { fontFamily: font.bodyHeavy, fontSize: 16, color: brand.cream },
  hint: { fontFamily: font.bodyBold, fontSize: 14, color: brand.cream, opacity: 0.9 },

  inShadow: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: brand.rosyDark },
  inputBig: { borderWidth: 3, paddingVertical: 16, paddingHorizontal: 20, fontFamily: font.bodyBold, fontSize: 22 },
  input: { borderWidth: 3, paddingVertical: 12, paddingHorizontal: 16, fontFamily: font.bodyBold, fontSize: 18 },
  error: { alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14, overflow: 'hidden', fontFamily: font.bodyBold, fontSize: 14.5 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 3, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 15 },
  presetOn: { backgroundColor: brand.zest, borderColor: brand.zestDark },
  presetText: { fontFamily: font.bodyHeavy, fontSize: 14.5 },
  details: { gap: 14 },
  locCard: { borderRadius: 22, padding: 14 },
  vibe: { borderWidth: 3, borderColor: 'rgba(255,248,242,0.55)', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  vibeOn: { backgroundColor: brand.teal, borderColor: brand.teal, borderBottomColor: brand.tealDark },
  vibeText: { fontFamily: font.bodyHeavy, fontSize: 14.5, color: brand.cream },
  vibeRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: brand.zest, borderWidth: 3, borderColor: brand.cream, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font.displaySemi, fontSize: 22, color: brand.tealDark },
  pwToggle: { position: 'absolute', right: 10, top: 0, bottom: 5, justifyContent: 'center', paddingHorizontal: 10 },
  pwToggleText: { fontFamily: font.bodyHeavy, fontSize: 15, textDecorationLine: 'underline' },
  divider: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,248,242,0.35)' },
  reassure: { fontFamily: font.bodyBold, fontSize: 14, color: brand.cream, textAlign: 'center', opacity: 0.9 },

  done: { gap: 16, alignItems: 'stretch' },
  blob: { alignSelf: 'center', width: 96, height: 96, backgroundColor: brand.cream, alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 44, borderTopRightRadius: 52, borderBottomRightRadius: 38, borderBottomLeftRadius: 58 },
  ticketWrap: { paddingBottom: 6 },
  ticketShadow: { position: 'absolute', left: 0, right: 0, top: 6, bottom: 0, borderRadius: 24, backgroundColor: brand.rosyDark },
  ticket: { borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  ticketLabel: { fontFamily: font.bodyHeavy, fontSize: 13, opacity: 0.85 },
  code: { fontFamily: font.display, fontSize: 30, letterSpacing: 1, color: brand.rosy, lineHeight: 34 },
  message: { fontFamily: font.bodyBold, fontSize: 15, color: brand.cream, textAlign: 'center', opacity: 0.95 },
  toast: { position: 'absolute', left: 20, right: 20, bottom: 24, flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 999, paddingVertical: 12, paddingHorizontal: 18 },
  toastText: { fontFamily: font.bodyHeavy, fontSize: 15, flex: 1 },
});

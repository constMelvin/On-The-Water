import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { isApiError } from '@/api/client';
import { findRoomId, getDirectory, joinRoom, previewRoom } from '@/api/galas';
import type { DirectoryRoomDto, RoomPreviewDto } from '@/api/types';
import { FlowCard, NameChips, SparkleBadge } from './FlowCard';
import { Icon } from './Icon';
import { Button, Field, Screen } from './ui';
import { OFFLINE_MESSAGE } from '@/lib/auth';
import { galaDates, todayIso } from '@/lib/dates';
import { displayCode, isValidCode } from '@/lib/rooms';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

const NOT_FOUND = "Hmm, we can't find that code. Check your group chat and try again.";
/** What to say when a code lookup fails. */
export const lookupError = (e: unknown) => (isApiError(e) && e.status === 0 ? OFFLINE_MESSAGE : NOT_FOUND);
const noRetryOn4xx = (n: number, e: Error) => !(isApiError(e) && e.status >= 400 && e.status < 500) && n < 2;

/**
 * Join a Gala (port of otw-client/src/app/join/page.tsx): step 1 = browse or type a code (teal), step 2 = "Is this the
 * one?" + Gala Password + nickname (rosy), then the success card. `initialCode` (deep link) jumps straight to step 2.
 */
export function JoinFlow({
  initialCode = '',
  initialEvent = null,
  initialError = '',
}: {
  initialCode?: string;
  /** Already looked up (deep link): start on step 2. */
  initialEvent?: RoomPreviewDto | null;
  initialError?: string;
}) {
  const { colors } = useTheme();
  const [step, setStep] = useState<1 | 2>(initialEvent ? 2 : 1);
  const [code, setCode] = useState(initialCode ? displayCode(initialCode) : '');
  const [codeError, setCodeError] = useState(initialError);
  const [event, setEvent] = useState<RoomPreviewDto | null>(initialEvent);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [busy, setBusy] = useState(false);
  const [joinedId, setJoinedId] = useState<string | null>(null);

  const openGala = async (raw: string) => {
    if (busy) return;
    const normalized = displayCode(raw);
    setCode(normalized);
    if (!isValidCode(normalized)) return setCodeError('Enter the full code, like OTW-7K2P-ABCD.');
    setCodeError('');
    setBusy(true);
    try {
      const preview = await previewRoom(normalized);
      if (preview.full) return setCodeError('This gala is already full.');
      setEvent(preview);
      setPassword('');
      setPasswordError('');
      setStep(2);
    } catch (e) {
      setCodeError(lookupError(e));
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    if (busy) return;
    if (!password) return setPasswordError("Enter the Gala Password. Ask your Gala Leader if you don't have it.");
    setPasswordError('');
    const nick = nickname.trim();
    if (nick.length < 2 || nick.length > 20) return setNicknameError('Add a nickname (at least 2 characters).');
    setNicknameError('');
    setBusy(true);
    try {
      setJoinedId(await joinRoom(code, nick, password));
    } catch (e) {
      if (isApiError(e, 'ROOM_NOT_FOUND')) {
        setStep(1);
        setCodeError(NOT_FOUND);
      } else if (isApiError(e, 'ALREADY_A_MEMBER')) {
        const roomId = await findRoomId(code).catch(() => null);
        if (roomId) router.replace({ pathname: '/gala/[roomId]', params: { roomId } });
        else router.replace('/');
      } else if (isApiError(e, 'INVALID_GALA_PASSWORD')) {
        setPasswordError("That password doesn't match. Check with your Gala Leader.");
      } else if (isApiError(e, 'DUPLICATE_NICKNAME')) {
        setNicknameError('Someone in this gala already uses that nickname. Pick another one.');
      } else if (isApiError(e, 'ROOM_FULL')) {
        setNicknameError('This gala is already full.');
      } else {
        setNicknameError(isApiError(e) && e.status !== 0 ? e.message : OFFLINE_MESSAGE);
      }
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    setStep(1);
    setNicknameError('');
    setPassword('');
    setPasswordError('');
  };

  const teal = step === 1 && !joinedId;

  return (
    <Screen section={teal ? 'teal' : 'rosy'} style={styles.page}>
      {!joinedId ? (
        <Pressable accessibilityRole="button" onPress={step === 1 ? () => router.back() : back} disabled={busy} style={styles.topBack}>
          <Icon name="back" size={18} color={brand.cream} />
          <Text style={styles.topBackText}>{step === 1 ? 'Back' : 'Back to the code'}</Text>
        </Pressable>
      ) : null}

      <FlowCard tone={teal ? 'teal' : 'rosy'}>
        {joinedId ? (
          <View style={styles.success}>
            <Animated.View entering={ZoomIn.delay(150).springify()} style={styles.checkWrap}>
              <View style={styles.checkShadow} />
              <View style={styles.checkBlob}>
                <Icon name="check" size={36} color={brand.tealDark} />
              </View>
            </Animated.View>
            <Text style={[styles.successHeading, { color: colors.text }]}>You&apos;re in. See you at the gala.</Text>
            <View style={[styles.chip, { backgroundColor: colors.surface2 }]}>
              <Text style={[styles.chipText, { color: colors.rosyInk }]}>
                {code} • {nickname.trim()}
              </Text>
            </View>
            <Button variant="zest" label="Go to the Gala" onPress={() => router.replace({ pathname: '/gala/[roomId]', params: { roomId: joinedId } })} />
          </View>
        ) : step === 1 ? (
          <>
            <SparkleBadge>ONE ACCOUNT, KAHIT ILANG GALA</SparkleBadge>
            <Text style={[styles.heading, { color: colors.text }]}>Saan tayo sasama?</Text>
            <Text style={[styles.subCopy, { color: colors.text }]}>
              Browse the galas, check the details, then join with the Gala Password. Got a code? Use it below.
            </Text>

            <GalaDirectory onPick={(c) => void openGala(c)} disabled={busy} />

            <View style={styles.or}>
              <View style={[styles.orLine, { backgroundColor: colors.line }]} />
              <Text style={[styles.orText, { color: colors.text }]}>or use a gala code</Text>
              <View style={[styles.orLine, { backgroundColor: colors.line }]} />
            </View>

            <Field
              label="Gala code"
              look="line"
              code
              value={code}
              onChangeText={(v) => {
                setCode(v.toUpperCase());
                setCodeError('');
              }}
              placeholder="Enter gala code"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!busy}
              error={codeError}
              hint="Looks like OTW-7K2P-ABCD"
              onSubmitEditing={() => void openGala(code)}
              returnKeyType="go"
            />
            <Button variant="zest" label={busy ? 'Checking...' : 'Continue'} busy={busy} onPress={() => void openGala(code)} />
            <View style={styles.secondary}>
              <Text style={[styles.secondaryText, { color: colors.text }]}>Want to start your own?</Text>
              <Text accessibilityRole="link" onPress={() => router.replace('/create')} style={[styles.planLink, { color: colors.rosyInk }]}>
                Plan a Gala
              </Text>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.heading, { color: colors.rosyInk }]}>Is this the one?</Text>
            {event ? (
              <View style={styles.eventWrap}>
                <View style={styles.eventShadow} />
                <View style={[styles.eventCard, { backgroundColor: colors.surface2 }]}>
                  <Text style={[styles.eventName, { color: colors.rosyInk }]}>{event.title}</Text>
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Icon name="calendar" size={15} color={colors.text} />
                      <Text style={[styles.metaText, { color: colors.text }]}>{galaDates(event.startDate, event.endDate)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Icon name="pin" size={15} color={colors.text} />
                      <Text style={[styles.metaText, { color: colors.text }]}>{event.destination}</Text>
                    </View>
                  </View>
                  <View style={styles.attHead}>
                    <Text style={[styles.attLabel, { color: colors.text }]}>Who&apos;s going</Text>
                    <Text style={[styles.attLabel, { color: colors.text }]}>{event.memberCount} people</Text>
                  </View>
                  <NameChips names={event.nicknames} />
                </View>
              </View>
            ) : null}

            <Field
              label="Gala Password"
              look="line"
              password
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setPasswordError('');
              }}
              placeholder="From your Gala Leader"
              maxLength={72}
              editable={!busy}
              error={passwordError}
              hint="Every gala has one. The Gala Leader can see it in Settings."
            />
            <Field
              label="What should we call you?"
              look="line"
              value={nickname}
              onChangeText={(v) => {
                setNickname(v);
                setNicknameError('');
              }}
              placeholder="e.g. Josh"
              maxLength={20}
              editable={!busy}
              error={nicknameError}
              hint="This is how your friends will see you."
              onSubmitEditing={() => void join()}
              returnKeyType="go"
            />
            <Button variant="zest" label={busy ? 'Joining...' : 'Join the Gala'} busy={busy} onPress={() => void join()} />
            <Button variant="cream" icon="back" label="Back" disabled={busy} onPress={back} />
          </>
        )}
      </FlowCard>
    </Screen>
  );
}

/** Listed galas with a search box (GET /rooms/directory, 5 at a time). "Details" shows who's going. */
function GalaDirectory({ onPick, disabled }: { onPick: (code: string) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  // Search after typing pauses, not on every key.
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const dir = useInfiniteQuery({
    queryKey: ['directory', q],
    queryFn: ({ pageParam }) => getDirectory(q, pageParam, 5),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    retry: noRetryOn4xx,
    staleTime: 30_000,
  });
  const galas: DirectoryRoomDto[] = dir.data?.pages.flatMap((p) => p.items) ?? [];
  const today = todayIso();

  return (
    <View style={styles.dir} accessibilityLabel="Galas you can join">
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by gala name or place"
        placeholderTextColor={colors.text + '80'}
        accessibilityLabel="Search galas"
        style={[styles.dirSearch, { backgroundColor: colors.fieldBg, borderColor: colors.line, color: colors.text }]}
      />
      {dir.isPending ? (
        <Text style={[styles.dirNote, { color: colors.text }]}>Looking for galas…</Text>
      ) : dir.isError ? (
        <Text style={[styles.dirNote, { color: colors.text }]}>
          {dir.error.message}{' '}
          <Text style={styles.dirMore} onPress={() => void dir.refetch()}>
            Try again
          </Text>
        </Text>
      ) : galas.length === 0 ? (
        <Text style={[styles.dirNote, { color: colors.text }]}>
          {q ? 'No gala matches that.' : 'No galas yet.'} Got a code from your group chat? Use it below.
        </Text>
      ) : (
        galas.map((g) => {
          const finished = (g.endDate ?? g.startDate) < today;
          const isOpen = open === g.roomCode;
          return (
            <View key={g.roomCode} style={[styles.dirItem, { backgroundColor: colors.surface2 }]}>
              <View style={styles.dirRow}>
                <View style={styles.dirMain}>
                  <Text style={[styles.dirTitle, { color: colors.text }]}>{g.title}</Text>
                  <Text style={[styles.dirSub, { color: colors.text }]}>
                    {galaDates(g.startDate, g.endDate)} · {g.destination}
                  </Text>
                  <Text style={[styles.dirSub, { color: colors.text }]}>
                    {`${g.memberCount} ${g.memberCount === 1 ? 'person' : 'people'}`}
                    {g.hostNickname ? ` · led by ${g.hostNickname}` : ''}
                    {finished ? ' · finished' : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.dirActions}>
                <Button sm fw={false} variant="cream" label={isOpen ? 'Hide' : 'Details'} onPress={() => setOpen(isOpen ? null : g.roomCode)} />
                {g.alreadyMember ? (
                  <Button sm fw={false} variant="teal" label="Open" onPress={() => router.replace({ pathname: '/gala/open/[code]', params: { code: g.roomCode } })} />
                ) : g.full ? (
                  <Text style={[styles.dirFull, { color: colors.rosyInk }]}>Full</Text>
                ) : (
                  <Button sm fw={false} variant="zest" label="Join" disabled={disabled} onPress={() => onPick(g.roomCode)} />
                )}
              </View>
              {isOpen ? <GalaDetails gala={g} /> : null}
            </View>
          );
        })
      )}
      {dir.hasNextPage ? (
        <Text style={[styles.dirMore, { color: colors.text }]} onPress={() => void dir.fetchNextPage()}>
          {dir.isFetchingNextPage ? 'Loading…' : 'Show more galas'}
        </Text>
      ) : null}
    </View>
  );
}

/** The expanded entry: code, dates, place, and who's going (GET /rooms/preview, up to 12 names). */
function GalaDetails({ gala }: { gala: DirectoryRoomDto }) {
  const { colors } = useTheme();
  const preview = useQuery({ queryKey: ['preview', gala.roomCode], queryFn: () => previewRoom(gala.roomCode), retry: noRetryOn4xx, staleTime: 30_000 });
  const names = preview.data?.nicknames ?? [];
  const more = (preview.data?.memberCount ?? 0) - names.length;
  const fact = (label: string, value: string) => (
    <View style={styles.fact}>
      <Text style={[styles.factLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.factValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
  return (
    <View style={[styles.details, { borderTopColor: colors.line }]}>
      {fact('Gala code', displayCode(gala.roomCode))}
      {fact('When', galaDates(gala.startDate, gala.endDate))}
      {fact('Where', gala.destination)}
      <Text style={[styles.factLabel, { color: colors.text }]}>Who&apos;s going</Text>
      {preview.isPending ? (
        <Text style={[styles.dirNote, { color: colors.text }]}>Loading…</Text>
      ) : preview.isError ? (
        <Text style={[styles.dirNote, { color: colors.text }]}>Couldn&apos;t load who&apos;s going.</Text>
      ) : names.length ? (
        <>
          <NameChips names={names} />
          {more > 0 ? <Text style={[styles.dirNote, { color: colors.text }]}>+{more} more</Text> : null}
        </>
      ) : (
        <Text style={[styles.dirNote, { color: colors.text }]}>Nobody yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 12, gap: 14 },
  topBack: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6 },
  topBackText: { fontFamily: font.bodyHeavy, fontSize: 15, color: brand.cream },

  heading: { fontFamily: font.displaySemi, fontSize: 26, lineHeight: 30 },
  subCopy: { fontFamily: font.bodyBold, fontSize: 15, lineHeight: 22 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  orLine: { flex: 1, height: 3, borderRadius: 2 },
  orText: { fontFamily: font.bodyHeavy, fontSize: 14 },
  secondary: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  secondaryText: { fontFamily: font.bodyBold, fontSize: 14 },
  planLink: { fontFamily: font.bodyHeavy, fontSize: 14, textDecorationLine: 'underline' },

  eventWrap: { paddingBottom: 6 },
  eventShadow: { position: 'absolute', left: 0, right: 0, top: 6, bottom: 0, borderRadius: 24, backgroundColor: brand.rosyDark },
  eventCard: { borderRadius: 24, paddingVertical: 20, paddingHorizontal: 22, gap: 12 },
  eventName: { fontFamily: font.displaySemi, fontSize: 21, lineHeight: 26 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: font.bodyBold, fontSize: 13.5 },
  attHead: { flexDirection: 'row', justifyContent: 'space-between' },
  attLabel: { fontFamily: font.bodyHeavy, fontSize: 13 },

  success: { alignItems: 'center', gap: 16, paddingVertical: 10 },
  checkWrap: { paddingBottom: 7 },
  checkShadow: { position: 'absolute', left: 0, right: 0, top: 7, bottom: 0, backgroundColor: brand.zestDark, borderTopLeftRadius: 38, borderTopRightRadius: 38, borderBottomRightRadius: 32, borderBottomLeftRadius: 44 },
  checkBlob: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.zest, borderTopLeftRadius: 38, borderTopRightRadius: 38, borderBottomRightRadius: 32, borderBottomLeftRadius: 44 },
  successHeading: { fontFamily: font.displaySemi, fontSize: 25, lineHeight: 30, textAlign: 'center' },
  chip: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20, borderBottomWidth: 4, borderBottomColor: brand.rosyDark },
  chipText: { fontFamily: font.bodyHeavy, fontSize: 15 },

  dir: { gap: 10 },
  dirSearch: { borderWidth: 3, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 11, fontFamily: font.bodyBold, fontSize: 15 },
  dirNote: { fontFamily: font.bodyBold, fontSize: 14 },
  dirMore: { fontFamily: font.bodyHeavy, fontSize: 14, textDecorationLine: 'underline', textAlign: 'center', paddingVertical: 4 },
  dirItem: { borderRadius: 20, padding: 14, gap: 10 },
  dirRow: { flexDirection: 'row', gap: 10 },
  dirMain: { flex: 1, gap: 2 },
  dirTitle: { fontFamily: font.displaySemi, fontSize: 17 },
  dirSub: { fontFamily: font.bodyBold, fontSize: 13 },
  dirActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dirFull: { fontFamily: font.bodyHeavy, fontSize: 14 },
  details: { gap: 6, paddingTop: 10, borderTopWidth: 2, borderStyle: 'dashed' },
  fact: { flexDirection: 'row', gap: 8 },
  factLabel: { fontFamily: font.bodyHeavy, fontSize: 13, minWidth: 74 },
  factValue: { flex: 1, fontFamily: font.bodyBold, fontSize: 13 },
});

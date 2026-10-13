import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { BounceIn, FadeIn, FadeInDown, SlideInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { Avatar, TONE_COLORS } from '@/components/Avatar';
import { Icon, type IconName } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { ErrorState, Skeleton } from '@/components/States';
import { Button, Card, IconBlob, ProgressBar, blob } from '@/components/ui';
import { castVote, closeAwards, openAwards } from '@/lib/api/gala';
import type { AwardCategoryVM, AwardKey, AwardResultVM, AwardsVM } from '@/lib/api/types';
import type { Tone } from '@/lib/otw/data';
import { burst, toast } from '@/lib/otw/feedback';
import { failed, useAwards } from '@/lib/otw/gala-queries';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey } from '@/lib/otw/live';
import { lookOf } from '@/lib/otw/profile';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { GalaPage } from './GalaShell';
import { galaHref } from './nav';

/**
 * Barkada Awards (port of otw-client/src/components/gala/awards/*): the Gala Leader opens a poll, everyone votes once
 * per award (changeable until it closes), then the ceremony reveals the winners. Votes are anonymous.
 * Certificates are drawn as a view and shared as a PNG (react-native-view-shot + expo-sharing).
 */
const AWARD_META: Record<AwardKey, { icon: IconName; tone: Tone; hint: (n: number) => string }> = {
  TAGASALBA: { icon: 'wallet', tone: 'rosy', hint: (n) => `paid ${n === 1 ? 'once' : `${n} times`}` },
  PAMILYA: { icon: 'checklist', tone: 'teal', hint: (n) => `ticked ${n} ${n === 1 ? 'item' : 'items'}` },
  LAGING_G: { icon: 'check', tone: 'zest', hint: () => '' },
  MAPANGARAPIN: { icon: 'route', tone: 'blossom', hint: (n) => `added ${n} ${n === 1 ? 'stop' : 'stops'}` },
  CHISMOSO: { icon: 'chat', tone: 'rosy', hint: (n) => `sent ${n} ${n === 1 ? 'message' : 'messages'}` },
  UNANG_DATING: { icon: 'clock', tone: 'teal', hint: () => '' },
  LATE_ROYALTY: { icon: 'crown', tone: 'zest', hint: () => '' },
  LITRATISTA: { icon: 'camera', tone: 'blossom', hint: (n) => `uploaded ${n} ${n === 1 ? 'photo' : 'photos'}` },
};

const whenLabel = (iso: string) => new Date(iso).toLocaleString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

interface CertificateTarget {
  userId: string;
  category: AwardCategoryVM;
}

export function Awards() {
  const { roomId, role, gala } = useGala();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const q = useAwards();
  const key = featureKey(roomId, 'awards');
  const [confirmClose, setConfirmClose] = useState(false);
  const [ceremony, setCeremony] = useState(false);
  const [cert, setCert] = useState<CertificateTarget | null>(null);
  const [hours, setHours] = useState<24 | 48 | 72>(48);
  const [busy, setBusy] = useState(false);

  if (q.isPending)
    return (
      <GalaPage>
        <Skeleton label="Loading the awards" />
      </GalaPage>
    );
  if (!q.data)
    return (
      <GalaPage>
        <ErrorState kind="completed" onRetry={async () => (await q.refetch()).isSuccess} />
      </GalaPage>
    );

  const data = q.data;
  const leader = role === 'leader';
  const set = (next: AwardsVM) => qc.setQueryData<AwardsVM>(key, next);

  const open = async () => {
    if (!roomId || busy) return;
    setBusy(true);
    try {
      set(await openAwards(roomId, hours));
      toast('Voting is open. G na!');
    } catch (e) {
      failed(qc, [key], e, "Couldn't open voting.");
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (!roomId || busy) return;
    setBusy(true);
    setConfirmClose(false);
    try {
      set(await closeAwards(roomId));
      toast('Voting closed. Here are the winners.');
      burst();
    } catch (e) {
      failed(qc, [key], e, "Couldn't close voting.");
    } finally {
      setBusy(false);
    }
  };

  const anyWinner = data.results.some((r) => r.winners.length > 0);

  return (
    <GalaPage>
      <View style={[styles.hero, { backgroundColor: colors.secRosy }]}>
        <IconBlob name="crown" index={2} size={96} iconSize={44} />
        <Text style={styles.h1}>Barkada Awards</Text>
        <Text style={styles.lead}>
          {data.state === 'CLOSED' ? 'And the winners are…' : data.state === 'OPEN' ? 'Sino ang bida ng barkada? Vote na.' : `Pagkatapos ng ${gala.title || 'gala'}, kilalanin ang mga bida.`}
        </Text>
      </View>

      {data.state === 'NOT_OPEN' ? (
        <Card>
          {leader && data.canOpen ? (
            <>
              <Text style={[styles.h2, { color: colors.text }]}>Open the voting</Text>
              <Text style={[styles.p, { color: colors.text }]}>
                Everyone votes once per award, and they can change it until voting closes. Results stay hidden until then. Votes are anonymous.
              </Text>
              <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="How long voting stays open">
                {([24, 48, 72] as const).map((h) => {
                  const on = hours === h;
                  return (
                    <Pressable
                      key={h}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      onPress={() => setHours(h)}
                      style={[styles.chip, on ? styles.chipOn : { borderColor: colors.line }]}>
                      <Text style={[styles.chipText, { color: on ? brand.cream : colors.text }]}>{h} hours</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Button icon="crown" label="Open voting" busy={busy} onPress={() => void open()} />
            </>
          ) : (
            <>
              <Text style={[styles.h2, { color: colors.text }]}>{leader ? 'Not ready yet' : 'Voting hasn’t opened'}</Text>
              <Text style={[styles.p, { color: colors.text }]}>{data.unavailableReason ?? 'The Gala Leader will open voting soon.'}</Text>
            </>
          )}
        </Card>
      ) : null}

      {data.state === 'OPEN' ? (
        <>
          <Card>
            <Text style={[styles.b, { color: colors.text }]}>
              {data.votedCount} of {data.eligibleVoters} voted
            </Text>
            {data.closesAt ? <Text style={[styles.p, { color: colors.text }]}>Voting closes {whenLabel(data.closesAt)}</Text> : null}
            <ProgressBar value={data.eligibleVoters ? (data.votedCount / data.eligibleVoters) * 100 : 0} label={`${data.votedCount} of ${data.eligibleVoters} members have voted`} />
            {leader ? <Button sm fw={false} variant="zest" icon="flag" label="Close voting" disabled={busy} onPress={() => setConfirmClose(true)} /> : null}
          </Card>
          <Ballot data={data} onVoted={set} />
        </>
      ) : null}

      {data.state === 'CLOSED' ? (
        <>
          <Card>
            <Text style={[styles.h2, { color: colors.text }]}>The winners are in</Text>
            <Text style={[styles.p, { color: colors.text }]}>
              {anyWinner ? 'Watch the awarding, one award at a time. You can replay it anytime.' : 'Walang bumoto this time, so there are no winners to reveal.'}
            </Text>
            {anyWinner ? <Button icon="crown" label="Start the ceremony" onPress={() => setCeremony(true)} /> : null}
          </Card>
          <ResultsList data={data} onCertificate={setCert} />
        </>
      ) : null}

      <Button variant="ghost" icon="back" label="Back to the recap" onPress={() => router.navigate(galaHref(roomId!, 'recap') as Href)} />

      {ceremony ? (
        <Ceremony
          results={data.results}
          categories={data.categories}
          gala={gala.title || 'gala'}
          onClose={() => setCeremony(false)}
          onCertificate={(t) => {
            setCeremony(false);
            setCert(t);
          }}
        />
      ) : null}
      {cert ? <CertificateSheet target={cert} onClose={() => setCert(null)} /> : null}
      {confirmClose ? (
        <Sheet
          title="Close voting now?"
          onClose={() => setConfirmClose(false)}
          footer={
            <>
              <Button label="Close voting" onPress={() => void close()} />
              <Button variant="ghost" label="Keep voting" onPress={() => setConfirmClose(false)} />
            </>
          }>
          <Text style={[styles.p, { color: colors.text }]}>
            Winners show up for everyone and votes can’t be changed anymore.
            {data.votedCount < data.eligibleVoters ? ` ${data.eligibleVoters - data.votedCount} still haven’t voted.` : ''}
          </Text>
        </Sheet>
      ) : null}
    </GalaPage>
  );
}

/* ---------------- ballot ---------------- */

const ADVANCE_MS = 450;

function Ballot({ data, onVoted }: { data: AwardsVM; onVoted: (next: AwardsVM) => void }) {
  const { roomId, myUserId, memberRows, nameOf, toneOf } = useGala();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const key = featureKey(roomId, 'awards');
  const cats = data.categories;
  const [pending, setPending] = useState<Partial<Record<AwardKey, string>>>({});
  const picks: Partial<Record<AwardKey, string>> = { ...data.myVotes, ...pending };
  const votedAll = cats.every((c) => !!picks[c.key]);
  const firstOpen = cats.findIndex((c) => !picks[c.key]);
  const [step, setStep] = useState(Math.max(0, firstOpen));
  const [folded, setFolded] = useState(votedAll);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const cat = cats[step];
  const meta = AWARD_META[cat.key];
  const t = TONE_COLORS[meta.tone];
  const candidates = memberRows.filter((m) => m.userId !== myUserId);
  const last = step === cats.length - 1;
  const hintFor = (userId: string) => {
    const h = cat.hints.find((x) => x.userId === userId);
    return h ? meta.hint(h.count) : '';
  };

  const vote = (nomineeId: string) => {
    if (!roomId || picks[cat.key] === nomineeId) return;
    const category = cat.key;
    setPending((p) => ({ ...p, [category]: nomineeId }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (last) {
        if (cats.every((c) => c.key === category || !!picks[c.key])) setFolded(true);
      } else {
        setStep((n) => Math.min(cats.length - 1, n + 1));
      }
    }, ADVANCE_MS);
    castVote(roomId, category, nomineeId)
      .then(onVoted)
      .catch((e: unknown) => failed(qc, [key], e, "Couldn't save your vote. Try again."))
      .finally(() =>
        setPending((p) => {
          const next = { ...p };
          delete next[category];
          return next;
        }),
      );
  };

  if (folded) {
    return (
      <View style={[styles.folded, { backgroundColor: colors.secBlossom }]} accessibilityLabel="Your votes">
        <IconBlob name="check" index={3} size={52} />
        <Text style={[styles.h2, { color: colors.secInk }]}>You&apos;re all set!</Text>
        <Text style={[styles.p, { color: colors.secInk }]}>Salamat sa boto. The winners show when voting closes.</Text>
        {cats.map((c) => {
          const id = picks[c.key];
          return (
            <View key={c.key} style={[styles.pickRow, { borderTopColor: colors.line }]}>
              <Text style={[styles.pickCat, { color: colors.secInk }]}>{c.title}</Text>
              {id ? (
                <View style={styles.pickWho}>
                  <Avatar name={nameOf(id)} tone={toneOf(id)} size={26} userId={id} />
                  <Text style={[styles.b, { color: colors.secInk }]}>{nameOf(id)}</Text>
                </View>
              ) : (
                <Text style={[styles.p, { color: colors.secInk, fontStyle: 'italic' }]}>Skipped</Text>
              )}
            </View>
          );
        })}
        <Button
          variant="ghost"
          color={colors.secInk}
          icon="edit"
          label="Change my votes"
          onPress={() => {
            setStep(0);
            setFolded(false);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.ballot}>
      <View style={styles.dots}>
        {cats.map((c, i) => (
          <Pressable
            key={c.key}
            accessibilityRole="button"
            accessibilityLabel={`${c.title}${picks[c.key] ? ', voted' : ''}`}
            onPress={() => setStep(i)}
            hitSlop={6}
            style={[styles.dot, { backgroundColor: i === step ? brand.rosy : picks[c.key] ? brand.teal : colors.surface2 }, i === step && styles.dotOn]}
          />
        ))}
      </View>
      <Animated.View key={cat.key} entering={FadeInDown.duration(250)}>
        <Card bg={t.bg} shadow={t.sh} style={styles.awardCard}>
          <View style={[styles.icoXl, blob(step, 88), { backgroundColor: colors.surface }]}>
            <Icon name={meta.icon} size={40} color={brand.rosy} />
          </View>
          <Text style={[styles.count, { color: t.fg }]}>
            Award {step + 1} of {cats.length}
          </Text>
          <Text style={[styles.awardTitle, { color: t.fg }]}>{cat.title}</Text>
          <Text style={[styles.blurb, { color: t.fg }]}>{cat.blurb}</Text>
        </Card>
      </Animated.View>
      <View style={styles.cands} accessibilityRole="radiogroup" accessibilityLabel={cat.title}>
        {candidates.map((m) => {
          const on = picks[cat.key] === m.userId;
          const hint = hintFor(m.userId);
          return (
            <View key={m.userId} style={styles.candCell}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => vote(m.userId)}
                style={[styles.cand, { backgroundColor: colors.surface, borderColor: on ? brand.rosy : colors.line }, on && { borderBottomWidth: 7 }]}>
                <Avatar name={nameOf(m.userId)} tone={toneOf(m.userId)} size={64} userId={m.userId} />
                <Text style={[styles.b, { color: colors.text, textAlign: 'center' }]} numberOfLines={1}>
                  {nameOf(m.userId)}
                </Text>
                {hint ? <Text style={[styles.hint, { color: colors.text }]}>{hint}</Text> : null}
                {on ? (
                  <View style={styles.tick}>
                    <Icon name="check" size={18} color={brand.cream} />
                  </View>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>
      {cat.hints.length > 0 ? <Text style={[styles.p, { color: colors.text }]}>Hints are just counts from your gala. You decide who wins.</Text> : null}
      <View style={styles.nav}>
        <View style={styles.flex}>
          <Button variant="ghost" icon="back" label="Back" disabled={step === 0} onPress={() => setStep((n) => Math.max(0, n - 1))} />
        </View>
        <View style={styles.flex}>
          {last ? (
            <Button icon="check" label="Finish" onPress={() => setFolded(true)} />
          ) : (
            <Button icon="arrowr" label={picks[cat.key] ? 'Next' : 'Skip'} onPress={() => setStep((n) => n + 1)} />
          )}
        </View>
      </View>
    </View>
  );
}

/* ---------------- results ---------------- */

function ResultsList({ data, onCertificate }: { data: AwardsVM; onCertificate: (t: CertificateTarget) => void }) {
  const { nameOf, toneOf } = useGala();
  const { colors } = useTheme();
  const cats = new Map<AwardKey, AwardCategoryVM>(data.categories.map((c) => [c.key, c]));
  return (
    <>
      {data.results.map((r) => {
        const cat = cats.get(r.categoryKey);
        const meta = AWARD_META[r.categoryKey];
        const t = TONE_COLORS[meta.tone];
        const none = r.winners.length === 0;
        return (
          <Card key={r.categoryKey} shadow={t.sh}>
            <View style={styles.resHead}>
              <View style={[styles.icoMd, { backgroundColor: t.bg }]}>
                <Icon name={meta.icon} size={26} color={t.fg} />
              </View>
              <Text style={[styles.h3, { color: colors.text }]}>{cat?.title ?? r.categoryKey}</Text>
            </View>
            {none ? (
              <Text style={[styles.p, { color: colors.text, fontStyle: 'italic' }]}>Walang bumoto</Text>
            ) : (
              <>
                {r.winners.map((id) => (
                  <View key={id} style={styles.winner}>
                    <Avatar name={nameOf(id)} tone={toneOf(id)} size={36} userId={id} />
                    <Text style={[styles.b, styles.flex, { color: colors.text }]}>{nameOf(id)}</Text>
                    {cat ? (
                      <Button
                        sm
                        fw={false}
                        variant="ghost"
                        icon="download"
                        label="Certificate"
                        accessibilityLabel={`Certificate for ${nameOf(id)}, ${cat.title}`}
                        onPress={() => onCertificate({ userId: id, category: cat })}
                      />
                    ) : null}
                  </View>
                ))}
                {r.winners.length > 1 ? <Text style={[styles.p, { color: colors.rosyInk }]}>Co-winners! Tabla ang boto.</Text> : null}
                {r.tally.map((v) => (
                  <View key={v.userId} style={styles.tally}>
                    <Text style={[styles.tallyName, { color: colors.text }]} numberOfLines={1}>
                      {nameOf(v.userId)}
                    </Text>
                    <View style={[styles.tallyTrack, { backgroundColor: colors.surface2 }]}>
                      <View style={{ width: `${(v.votes / Math.max(1, r.tally[0].votes)) * 100}%`, height: '100%', borderRadius: 6, backgroundColor: t.bg }} />
                    </View>
                    <Text style={[styles.b, { color: colors.text }]}>{v.votes}</Text>
                  </View>
                ))}
              </>
            )}
          </Card>
        );
      })}
    </>
  );
}

/* ---------------- ceremony ---------------- */

type Stage = 'intro' | 'drum' | 'win' | 'summary';
const DRUM_MS = 1500;

function Trophy() {
  return (
    <Svg width={48} height={58} viewBox="0 0 48 58" fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 6h24v14a12 12 0 0 1-24 0z" fill={brand.zest} stroke={brand.tealDark} />
      <Path d="M12 10H6a3 3 0 0 0-3 3c0 6 5 10 10 10M36 10h6a3 3 0 0 1 3 3c0 6-5 10-10 10" stroke={brand.tealDark} />
      <Path d="M24 32v9M16 52h16M18 41h12l2 11H16z" fill={brand.zest} stroke={brand.tealDark} />
      <Path d="M24 11l1.4 4.1 4.1 1.4-4.1 1.4L24 22l-1.4-4.1-4.1-1.4 4.1-1.4z" fill={brand.rosy} stroke="none" />
    </Svg>
  );
}

function Ceremony({
  results,
  categories,
  gala,
  onClose,
  onCertificate,
}: {
  results: AwardResultVM[];
  categories: AwardCategoryVM[];
  gala: string;
  onClose: () => void;
  onCertificate: (t: CertificateTarget) => void;
}) {
  const { nameOf, toneOf } = useGala();
  const steps = results.filter((r) => r.winners.length > 0);
  const [idx, setIdx] = useState(0);
  const [stage, setStage] = useState<Stage>(steps.length ? 'intro' : 'summary');
  const step = steps[idx];
  const cat = step ? categories.find((c) => c.key === step.categoryKey) : undefined;
  const meta = step ? AWARD_META[step.categoryKey] : null;

  useEffect(() => {
    if (stage !== 'drum') return;
    const t = setTimeout(() => setStage('win'), DRUM_MS);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'win') return;
    const t = setTimeout(burst, 900);
    return () => clearTimeout(t);
  }, [stage, idx]);

  const next = () => {
    if (idx + 1 >= steps.length) setStage('summary');
    else {
      setIdx(idx + 1);
      setStage('intro');
    }
  };

  const bg = stage === 'summary' || !meta ? brand.tealDark : TONE_COLORS[meta.tone].sh;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={[styles.stage, { backgroundColor: bg }]}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.skip}>
          <Icon name="x" size={18} color={brand.cream} />
          <Text style={styles.skipText}>{stage === 'summary' ? 'Close' : 'Skip ceremony'}</Text>
        </Pressable>

        {stage !== 'summary' && step && cat && meta ? (
          <View style={styles.center} key={`${idx}-${stage === 'win' ? 'w' : 'i'}`}>
            <Text style={styles.cCount}>
              Award {idx + 1} of {steps.length}
            </Text>
            {stage !== 'win' ? (
              <>
                <Animated.View entering={ZoomIn.springify()} style={[styles.icoXl, blob(idx, 96), { backgroundColor: brand.cream, width: 96, height: 96 }]}>
                  <Icon name={meta.icon} size={48} color={brand.rosy} />
                </Animated.View>
                <Text style={styles.cTitle}>{cat.title}</Text>
                <Text style={styles.cBlurb}>{cat.blurb}</Text>
                {stage === 'drum' ? (
                  <Animated.Text entering={FadeIn} style={styles.drum} accessibilityLiveRegion="polite">
                    Ang nanalo ay…
                  </Animated.Text>
                ) : (
                  <Button variant="cream" fw={false} icon="sparkle" label="Reveal the winner" onPress={() => setStage('drum')} />
                )}
              </>
            ) : (
              <>
                <View style={styles.award}>
                  <Icon name={meta.icon} size={20} color={brand.cream} />
                  <Text style={styles.awardText}>{cat.title}</Text>
                </View>
                <View style={styles.podium}>
                  {step.winners.map((id, i) => (
                    <Animated.View key={id} entering={SlideInUp.delay(i * 160).springify()} style={styles.walker}>
                      <Animated.View entering={BounceIn.delay(700 + i * 160)}>
                        <Trophy />
                      </Animated.View>
                      <Avatar name={nameOf(id)} tone={toneOf(id)} size={step.winners.length > 2 ? 72 : 92} userId={id} />
                      <Text style={styles.winnerName} numberOfLines={1}>
                        {nameOf(id)}
                      </Text>
                    </Animated.View>
                  ))}
                </View>
                <View style={styles.steps}>
                  <View style={[styles.stepBlock, { height: 26, width: '60%' }]} />
                  <View style={[styles.stepBlock, { height: 22, width: '80%', backgroundColor: brand.zestDark }]} />
                </View>
                <Text style={styles.cSub}>
                  {step.winners.length > 1 ? 'Co-winners! Tabla ang boto.' : 'Panalo!'} {step.tally[0].votes} {step.tally[0].votes === 1 ? 'vote' : 'votes'}
                </Text>
                <Button variant="cream" fw={false} icon="arrowr" label={idx + 1 >= steps.length ? 'See all winners' : 'Next award'} onPress={next} />
              </>
            )}
          </View>
        ) : null}

        {stage === 'summary' ? (
          <ScrollView contentContainerStyle={styles.summary}>
            <Text style={styles.sumTitle}>Ang mga bida ng {gala}</Text>
            {steps.length === 0 ? <Text style={styles.cSub}>Walang bumoto sa kahit anong award this time.</Text> : null}
            {steps.map((r) => {
              const m = AWARD_META[r.categoryKey];
              const t = TONE_COLORS[m.tone];
              const c = categories.find((x) => x.key === r.categoryKey);
              return (
                <View key={r.categoryKey} style={[styles.sumRow, { backgroundColor: t.bg }]}>
                  <Icon name={m.icon} size={22} color={t.fg} />
                  <View style={styles.flex}>
                    <Text style={[styles.b, { color: t.fg }]}>{c?.title}</Text>
                    <Text style={[styles.p, { color: t.fg }]}>{r.winners.map((id) => nameOf(id)).join(' & ')}</Text>
                  </View>
                  {c
                    ? r.winners.map((id) => (
                        <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Certificate for ${nameOf(id)}, ${c.title}`} onPress={() => onCertificate({ userId: id, category: c })} style={styles.certBtn}>
                          <Icon name="download" size={16} color={brand.tealDark} />
                        </Pressable>
                      ))
                    : null}
                </View>
              );
            })}
            {steps.length > 0 ? (
              <Button
                variant="ghost"
                color={brand.cream}
                icon="refresh"
                label="Replay"
                onPress={() => {
                  setIdx(0);
                  setStage('intro');
                }}
              />
            ) : null}
            <Button variant="cream" label="Done" onPress={onClose} />
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

/* ---------------- certificate ---------------- */

/** The winner's e-certificate, drawn as a view (same layout as the web's canvas), then shared as a PNG. */
function CertificateSheet({ target, onClose }: { target: CertificateTarget; onClose: () => void }) {
  const { gala, nameOf, toneOf } = useGala();
  const ref = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const name = nameOf(target.userId);
  const meta = AWARD_META[target.category.key];
  const look = lookOf(target.userId);
  const tone = TONE_COLORS[look?.tone ?? toneOf(target.userId) ?? meta.tone];

  const share = async () => {
    setBusy(true);
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) return toast("Sharing isn't available on this phone.", 'err');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `${name} is ${target.category.title}!` });
    } catch {
      toast("Couldn't make the certificate. Try again in a moment.", 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Certificate" onClose={onClose} footer={<Button icon="share" label="Share or save" busy={busy} onPress={() => void share()} />}>
      <View ref={ref} collapsable={false} style={styles.cert}>
        <View style={[styles.certBlob, { top: -60, left: -60, backgroundColor: brand.blossom }]} />
        <View style={[styles.certBlob, { bottom: -70, right: -70, backgroundColor: brand.zest }]} />
        <View style={styles.certFrame}>
          <Image source={require('../../../assets/images/otw-logo.png')} style={styles.certLogo} contentFit="contain" />
          <Text style={styles.certKicker}>Sertipiko ng Parangal</Text>
          <View style={[styles.certAv, { borderColor: brand.cream, backgroundColor: tone.bg, borderBottomColor: tone.sh }]}>
            {look?.photo ? (
              <Image source={{ uri: look.photo }} style={styles.certPhoto} />
            ) : (
              <Text style={[styles.certInitial, { color: tone.fg }]}>{(name.trim()[0] ?? '?').toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.certSmall}>Pinarangalan si</Text>
          <Text style={styles.certName} numberOfLines={1} adjustsFontSizeToFit>
            {name}
          </Text>
          <View style={[styles.certPill, { backgroundColor: tone.bg, borderBottomColor: tone.sh }]}>
            <Text style={[styles.certAward, { color: tone.fg }]} numberOfLines={1} adjustsFontSizeToFit>
              {target.category.title}
            </Text>
          </View>
          <Text style={styles.certBlurb} numberOfLines={2}>
            {target.category.blurb}
          </Text>
          <Text style={styles.certFoot} numberOfLines={1} adjustsFontSizeToFit>
            {gala.title || 'our gala'} · {gala.range || gala.date || ''}
          </Text>
          <View style={styles.seal}>
            <Icon name="sparkle" size={22} color={brand.cream} />
          </View>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { borderRadius: 30, padding: 22, gap: 10, alignItems: 'center' },
  h1: { fontFamily: font.displaySemi, fontSize: 30, color: brand.cream },
  lead: { fontFamily: font.bodyBold, fontSize: 17, color: brand.cream, textAlign: 'center' },
  h2: { fontFamily: font.displaySemi, fontSize: 22 },
  h3: { fontFamily: font.displaySemi, fontSize: 19, flex: 1 },
  p: { fontFamily: font.body, fontSize: 15, lineHeight: 21 },
  b: { fontFamily: font.bodyHeavy, fontSize: 15 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 3, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  chipOn: { backgroundColor: brand.teal, borderColor: brand.teal, borderBottomColor: brand.tealDark },
  chipText: { fontFamily: font.bodyHeavy, fontSize: 14 },
  folded: { borderRadius: 28, padding: 18, gap: 10, alignItems: 'stretch' },
  pickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTopWidth: 2, paddingTop: 8 },
  pickCat: { fontFamily: font.bodyBold, fontSize: 14, flex: 1 },
  pickWho: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ballot: { gap: 14 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotOn: { width: 26 },
  awardCard: { alignItems: 'center', gap: 6 },
  icoXl: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  icoMd: { width: 48, height: 48, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  count: { fontFamily: font.bodyHeavy, fontSize: 13 },
  awardTitle: { fontFamily: font.display, fontSize: 28, textAlign: 'center' },
  blurb: { fontFamily: font.bodyBold, fontSize: 15, textAlign: 'center' },
  cands: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  candCell: { width: '50%', padding: 5 },
  cand: { borderWidth: 3, borderRadius: 24, padding: 12, alignItems: 'center', gap: 6 },
  hint: { fontFamily: font.bodyBold, fontSize: 12, opacity: 0.8, textAlign: 'center' },
  tick: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: brand.rosy, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', gap: 10 },
  resHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  winner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tally: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tallyName: { width: 90, fontFamily: font.bodyBold, fontSize: 13 },
  tallyTrack: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },
  stage: { flex: 1 },
  skip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', padding: 14 },
  skipText: { fontFamily: font.bodyHeavy, fontSize: 15, color: brand.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 20 },
  cCount: { fontFamily: font.bodyHeavy, fontSize: 14, color: brand.cream, opacity: 0.9 },
  cTitle: { fontFamily: font.display, fontSize: 34, color: brand.cream, textAlign: 'center' },
  cBlurb: { fontFamily: font.bodyBold, fontSize: 17, color: brand.cream, textAlign: 'center' },
  drum: { fontFamily: font.displaySemi, fontSize: 24, color: brand.zest },
  award: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  awardText: { fontFamily: font.displaySemi, fontSize: 18, color: brand.cream },
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 14 },
  walker: { alignItems: 'center', gap: 4, maxWidth: 110 },
  winnerName: { fontFamily: font.display, fontSize: 22, color: brand.cream },
  steps: { width: '80%', alignItems: 'center' },
  stepBlock: { backgroundColor: brand.zest, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  cSub: { fontFamily: font.bodyHeavy, fontSize: 16, color: brand.cream, textAlign: 'center' },
  summary: { padding: 20, gap: 12 },
  sumTitle: { fontFamily: font.display, fontSize: 28, color: brand.cream, textAlign: 'center', marginBottom: 6 },
  sumRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 20, padding: 12 },
  certBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: brand.cream, alignItems: 'center', justifyContent: 'center' },
  cert: { aspectRatio: 1080 / 1350, backgroundColor: brand.cream, borderRadius: 24, overflow: 'hidden', borderWidth: 6, borderColor: brand.rosy },
  certBlob: { position: 'absolute', width: 200, height: 200, borderRadius: 100 },
  certFrame: { flex: 1, margin: 10, borderRadius: 18, borderWidth: 2, borderStyle: 'dashed', borderColor: brand.tealDark, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  certLogo: { width: 120, height: 82 },
  certKicker: { fontFamily: font.displaySemi, fontSize: 16, color: brand.rosy },
  certAv: { width: 96, height: 96, borderRadius: 48, borderWidth: 5, borderBottomWidth: 9, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginVertical: 4 },
  certPhoto: { width: '100%', height: '100%' },
  certInitial: { fontFamily: font.display, fontSize: 52 },
  certSmall: { fontFamily: font.bodyHeavy, fontSize: 13, color: brand.teal },
  certName: { fontFamily: font.display, fontSize: 34, color: brand.tealDark },
  certPill: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 20, borderBottomWidth: 4, maxWidth: '92%' },
  certAward: { fontFamily: font.display, fontSize: 20 },
  certBlurb: { fontFamily: font.bodyBold, fontSize: 12, color: brand.teal, textAlign: 'center', marginTop: 4 },
  certFoot: { fontFamily: font.bodyHeavy, fontSize: 12, color: brand.tealDark, marginTop: 'auto' },
  seal: { width: 44, height: 44, borderRadius: 22, backgroundColor: brand.rosy, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: brand.rosyDark },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, TONE_COLORS } from '@/components/Avatar';
import { Icon, type IconName } from '@/components/Icon';
import { StateGate } from '@/components/States';
import { Button, Card, PageHead, StatusBadge } from '@/components/ui';
import { nudgeMember } from '@/lib/api/gala';
import { ST, counts, type AttendanceKey, type Tone } from '@/lib/otw/data';
import { burst, toast } from '@/lib/otw/feedback';
import { useGala } from '@/lib/otw/gala-store';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { GalaPage } from './GalaShell';

/** Who's G? (port of otw-client/src/components/gala/attendance/*): status choice, totals, members per status. */

const TONE: Record<AttendanceKey, Tone> = { g: 'teal', m: 'zest', x: 'blossom' };
const TILES: [AttendanceKey, label: string, icon: IconName][] = [
  ['g', 'going', 'users'],
  ['m', 'maybe', 'clock'],
  ['x', "can't make it", 'x'],
];

function StatusChoice() {
  const { myStatus, setMyStatus } = useGala();
  const { colors } = useTheme();
  const pick = (k: AttendanceKey) => {
    setMyStatus(k);
    if (k === 'g') {
      toast("You're marked as G. The chat knows.");
      burst();
    } else {
      toast(`Status updated: ${ST[k].l}.`);
    }
  };
  return (
    <View style={styles.choice} accessibilityRole="radiogroup" accessibilityLabel="Your status">
      {(['g', 'm', 'x'] as AttendanceKey[]).map((k) => {
        const t = TONE_COLORS[TONE[k]];
        const on = myStatus === k;
        return (
          <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => pick(k)} style={styles.chWrap}>
            {({ pressed }) => (
              <>
                <View style={[styles.chShadow, { backgroundColor: t.sh }]} />
                <View
                  style={[
                    styles.ch,
                    { backgroundColor: t.bg, borderColor: on ? colors.focus : t.bg, transform: [{ translateY: pressed ? 4 : 0 }] },
                  ]}>
                  <Icon name={ST[k].i} size={26} color={t.fg} />
                  <Text style={[styles.chText, { color: t.fg }]}>{ST[k].l}</Text>
                </View>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function SummaryTiles() {
  const { members } = useGala();
  const c = counts(members);
  return (
    <View style={styles.tiles}>
      {TILES.map(([k, label, icon]) => {
        const t = TONE_COLORS[TONE[k]];
        const pct = members.length ? (c[k] / members.length) * 100 : 0;
        return (
          <View key={k} style={[styles.tile, { backgroundColor: t.bg }]}>
            <View style={styles.mark}>
              <Icon name={icon} size={64} color={t.fg} />
            </View>
            <Text style={[styles.tileNum, { color: t.fg }]}>{c[k]}</Text>
            <Text style={[styles.tileLbl, { color: t.fg }]}>{label}</Text>
            <View style={[styles.bar, { backgroundColor: t.sh }]}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: t.fg }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function MemberGroups() {
  const { members, memberRows, me, role, roomId } = useGala();
  const { colors } = useTheme();
  // The server only nudges members who answered Maybe (not the ones who haven't answered yet).
  const saidMaybe = new Set(memberRows.filter((r) => r.rsvpStatus === 'MAYBE').map((r) => r.userId));
  const nudge = (userId: string, name: string) => {
    if (!roomId) return;
    nudgeMember(roomId, userId)
      .then(() => toast(`Nudged ${name}.`))
      .catch((e: unknown) => toast(e instanceof Error && e.message ? e.message : `Couldn't nudge ${name}.`, 'err'));
  };
  return (
    <>
      {(['g', 'm', 'x'] as AttendanceKey[]).map((k) => {
        const group = members.filter((m) => m.s === k);
        return (
          <Card key={k}>
            <View style={styles.rh}>
              <Text style={[styles.h3, { color: colors.text }]}>{ST[k].b}</Text>
              <StatusBadge status={k} />
            </View>
            {group.length ? (
              group.map((m) => (
                <View key={m.id ?? m.n} style={styles.mrow}>
                  <Avatar name={m.n} tone={m.c} size={34} online={!!m.on} userId={m.id} />
                  <Text style={[styles.mname, { color: colors.text }]} numberOfLines={1}>
                    {m.n}
                    {m.n === me ? ' (you)' : ''}
                  </Text>
                  {k === 'm' && role === 'leader' && m.n !== me && m.id && saidMaybe.has(m.id) ? (
                    <Button sm fw={false} variant="ghost" label="Nudge" accessibilityLabel={`Nudge ${m.n}`} onPress={() => nudge(m.id!, m.n)} />
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={[styles.fine, { color: colors.text }]}>Nobody here yet.</Text>
            )}
          </Card>
        );
      })}
    </>
  );
}

export function Attendance() {
  const { viewState, liveState, setViewState, retry, openSheet } = useGala();
  const state = viewState !== 'default' ? viewState : liveState;
  return (
    <GalaPage>
      <PageHead title="So... who's G?" sub="Change your status any time. Everyone sees it right away." />
      <StateGate
        state={state}
        kind="attendance"
        onAction={() => openSheet('share')}
        onRetry={() => {
          setViewState('default');
          return retry();
        }}>
        <StatusChoice />
        <SummaryTiles />
        <MemberGroups />
      </StateGate>
    </GalaPage>
  );
}

const styles = StyleSheet.create({
  choice: { flexDirection: 'row', gap: 10 },
  chWrap: { flex: 1, paddingBottom: 6 },
  chShadow: { position: 'absolute', left: 0, right: 0, top: 6, bottom: 0, borderRadius: 24 },
  ch: { borderRadius: 24, borderWidth: 4, paddingVertical: 16, paddingHorizontal: 6, alignItems: 'center', gap: 6 },
  chText: { fontFamily: font.displaySemi, fontSize: 15, textAlign: 'center' },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderRadius: 24, padding: 14, overflow: 'hidden', gap: 2 },
  mark: { position: 'absolute', right: -14, bottom: -10, opacity: 0.18 },
  tileNum: { fontFamily: font.display, fontSize: 34, lineHeight: 38 },
  tileLbl: { fontFamily: font.bodyHeavy, fontSize: 13 },
  bar: { height: 8, borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  rh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h3: { fontFamily: font.displaySemi, fontSize: 20 },
  mrow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  mname: { flex: 1, fontFamily: font.bodyHeavy, fontSize: 15 },
  fine: { fontFamily: font.body, fontSize: 14, opacity: 0.85 },
});

import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Icon, type IconName } from '@/components/Icon';
import { Empty, ErrorState, Offline, Skeleton } from '@/components/States';
import { Button, Card, Lnk, StatusBadge, Tag, blob } from '@/components/ui';
import { ST, counts, peso, type AttendanceKey } from '@/lib/otw/data';
import { burst, toast } from '@/lib/otw/feedback';
import { countdownTo, galaStart } from '@/lib/otw/gala-registry';
import { useGala } from '@/lib/otw/gala-store';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { GalaPage } from './GalaShell';
import { galaHref } from './nav';
import { useCopyCode } from './useCopyCode';

/** Port of otw-client/src/components/gala/Dashboard.tsx at phone width (hero, journey, feature cards, rail). */

type Tone = 'blossom' | 'zest' | 'cream' | 'teal' | 'rosy';

const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`);

function useHref() {
  const { roomId } = useGala();
  return (seg: string) => () => router.navigate(galaHref(roomId!, seg) as Href);
}

function Countdown() {
  const { gala } = useGala();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const left = gala.dateISO ? countdownTo(galaStart(gala.dateISO, gala.startTime), new Date(now)) : { d: 0, h: 0, m: 0 };
  const box = (n: number, label: string) => (
    <View style={styles.cbox}>
      <Text style={styles.cnum}>{n}</Text>
      <Text style={styles.clabel}>{label}</Text>
    </View>
  );
  return (
    <View
      style={styles.cdown}
      accessibilityLabel={`Countdown: ${left.d} ${plural(left.d, 'day')}, ${left.h} ${plural(left.h, 'hour')}, ${left.m} ${plural(left.m, 'minute')}`}>
      {box(left.d, plural(left.d, 'day'))}
      {box(left.h, plural(left.h, 'hour'))}
      {box(left.m, plural(left.m, 'min'))}
    </View>
  );
}

/** "Your status" 3-way control (reference seg3). */
function StatusSeg() {
  const { myStatus, setMyStatus } = useGala();
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
    <View style={styles.seg} accessibilityRole="radiogroup" accessibilityLabel="Your status">
      {(['g', 'm', 'x'] as AttendanceKey[]).map((k) => {
        const on = myStatus === k;
        return (
          <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => pick(k)} style={[styles.segBtn, on && styles.segOn]}>
            <Text style={[styles.segText, { color: on ? brand.cream : brand.tealDark }]}>{ST[k].l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Hero() {
  const { phase, gala, members, summary } = useGala();
  const { colors } = useTheme();
  const href = useHref();
  const travel = summary?.travel;

  let body;
  if (phase === 'done') {
    body = (
      <>
        <Text style={styles.h1s}>You made it happen.</Text>
        <Text style={styles.lead}>From “G tayo?” to an actual day on the calendar.</Text>
        <Button variant="zest" fw={false} label="See the recap" onPress={href('recap')} />
      </>
    );
  } else if (phase === 'day') {
    body = (
      <>
        <Text style={styles.h1s}>Today&apos;s the day.</Text>
        <Text style={styles.lead}>{[gala.title, gala.dest].filter(Boolean).join(' · ')}</Text>
        <View style={styles.pmeta}>
          {travel?.arrived ? <Tag variant="cream" icon="check">{`${travel.arrived} already there`}</Tag> : null}
          {travel?.almostThere ? <Tag variant="zest" icon="nav">{`${travel.almostThere} almost there`}</Tag> : null}
          {travel?.onTheWay ? <Tag variant="cream" icon="clock">{`${travel.onTheWay} on the way`}</Tag> : null}
        </View>
        <Button variant="zest" icon="map" label="Open the map" onPress={href('map')} />
        <StatusSeg />
      </>
    );
  } else {
    body = (
      <>
        <Text style={styles.h1s}>Let&apos;s get this gala together.</Text>
        <Text style={styles.gt}>{gala.title}</Text>
        <View style={styles.pmeta}>
          {gala.range ? <Tag variant="cream" icon="calendar">{gala.range}</Tag> : null}
          {gala.dest ? <Tag variant="cream" icon="pin">{gala.dest}</Tag> : null}
          <Tag variant="cream" icon="users">{`${members.length} ${members.length === 1 ? 'person' : 'people'}`}</Tag>
        </View>
        <Countdown />
        <View style={styles.mystat}>
          <Text style={styles.mystatLabel}>Your status</Text>
          <StatusSeg />
        </View>
      </>
    );
  }
  return <View style={[styles.dhero, { backgroundColor: colors.secRosy }]}>{body}</View>;
}

const ROUTE: [label: string, icon: IconName, seg: string][] = [
  ['G tayo?', 'sparkle', ''],
  ['When', 'calendar', 'settings'],
  ["Who's G?", 'users', 'attendance'],
  ['Plan', 'route', 'route'],
  ['How much', 'calc', 'budget'],
  ['What we need', 'checklist', 'checklist'],
  ['Where is everyone', 'pin', 'map'],
  ['OTW na.', 'nav', 'map'],
];

function RouteStrip() {
  const { phase } = useGala();
  const { colors } = useTheme();
  const href = useHref();
  const done = phase === 'planning' ? 5 : phase === 'day' ? 6 : 8;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.route} accessibilityLabel="Gala journey">
      {ROUTE.map(([label, icon, seg], i) => {
        const state = i < done ? 'done' : i === done ? 'cur' : 'lock';
        const dotBg = state === 'done' ? brand.teal : state === 'cur' ? brand.rosy : colors.surface2;
        const ink = state === 'lock' ? colors.text : brand.cream;
        return (
          <Pressable key={label} onPress={href(seg)} style={[styles.rs, state === 'lock' && { opacity: 0.6 }]}>
            {i > 0 ? <View style={[styles.rline, { backgroundColor: i <= done ? brand.teal : colors.line }]} /> : null}
            <View style={[styles.dot, { backgroundColor: dotBg }, state === 'cur' && styles.dotCur]}>
              <Icon name={state === 'done' ? 'check' : icon} size={18} color={ink} />
            </View>
            <Text style={[styles.rl, { color: colors.text }]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const TONE_BG: Record<Tone, (c: ReturnType<typeof useTheme>['colors']) => { bg: string; fg: string; sh: string }> = {
  blossom: () => ({ bg: brand.blossom, fg: brand.tealDark, sh: brand.rosy }),
  zest: () => ({ bg: brand.zest, fg: brand.tealDark, sh: brand.zestDark }),
  cream: (c) => ({ bg: c.surface, fg: c.text, sh: c.line }),
  teal: () => ({ bg: brand.teal, fg: brand.cream, sh: brand.tealDark }),
  rosy: () => ({ bg: brand.rosy, fg: brand.cream, sh: brand.rosyDark }),
};

function FeatureGrid() {
  const { members, phase, unread, summary } = useGala();
  const { colors } = useTheme();
  const href = useHref();
  const c = counts(members);
  const stopCount = summary ? summary.itineraryStops : '—';
  const packed = summary ? summary.checklistDone : '—';
  const itemCount = summary ? summary.checklistTotal : '—';
  const perPerson = summary ? peso(summary.budgetPerPerson) : '—';
  const spentSoFar = summary ? peso(summary.totalSpent) : '—';
  const photos = summary?.photoCount ?? 0;

  const F: [seg: string, title: string, sub: string, icon: IconName, tone: Tone, tag: string][] = [
    ['attendance', "Who's G?", `${c.g} going · ${c.m} maybe`, 'users', 'blossom', 'Attendance'],
    ['route', "What's the plan?", `${stopCount} stops on the route`, 'route', 'zest', 'Itinerary'],
    ['budget', 'How much?', `${perPerson} per person`, 'calc', 'cream', 'Budget'],
    ['ambagan', 'Who paid?', `${spentSoFar} spent so far`, 'wallet', 'teal', 'Ambagan'],
    ['checklist', 'What are we bringing?', `${packed} of ${itemCount} packed`, 'checklist', 'blossom', 'Checklist'],
    ['map', 'Where is everyone?', phase === 'planning' ? 'Opens on gala day' : "Tap to see who's OTW", 'nav', 'rosy', 'Live location'],
    ['chat', "What's the chismis?", `${unread} new messages`, 'chat', 'zest', 'Chat'],
    ['dump', 'What did we get?', photos ? `${photos} photos so far` : 'No memories yet', 'image', 'cream', 'Gala Dump'],
    ['couple', 'Just the two of you?', 'Same OTW energy.', 'heart', 'blossom', 'Couple Mode'],
  ];

  return (
    <View style={styles.fgrid}>
      {F.map(([seg, title, sub, icon, tone, tag], i) => {
        const t = TONE_BG[tone](colors);
        return (
          <View key={seg} style={styles.fcell}>
            <Card bg={t.bg} shadow={t.sh} onPress={href(seg)} style={styles.fcard}>
              <View style={[styles.ico, blob(i, 52), { backgroundColor: tone === 'cream' ? colors.surface2 : colors.surface }]}>
                <Icon name={icon} size={26} color={brand.rosy} />
              </View>
              <Text style={[styles.fh, { color: t.fg }]}>{title}</Text>
              <Text style={[styles.fp, { color: t.fg }]}>{sub}</Text>
              <Tag variant={tone === 'zest' ? 'cream' : 'zest'}>{tag}</Tag>
            </Card>
          </View>
        );
      })}
    </View>
  );
}

function Rail() {
  const { gala, members, me, role, openSheet } = useGala();
  const { colors } = useTheme();
  const copyCode = useCopyCode();
  const href = useHref();
  const c = counts(members);

  return (
    <>
      <Card>
        <View style={styles.rh}>
          <Text style={[styles.h3, { color: colors.text }]}>Who&apos;s in</Text>
          <Tag variant="st-g" icon="check">{`${c.g} going`}</Tag>
        </View>
        {members.slice(0, 6).map((m) => (
          <View key={m.id ?? m.n} style={styles.mrow}>
            <Avatar name={m.n} tone={m.c} size={34} online={!!m.on} userId={m.id} />
            <Text style={[styles.mname, { color: colors.text }]} numberOfLines={1}>
              {m.n}
              {m.n === me ? ' (you)' : ''}
            </Text>
            {m.role === 'leader' ? <Icon name="crown" size={16} color={colors.text} /> : null}
            <StatusBadge status={m.s} />
          </View>
        ))}
        {members.length <= 1 ? (
          <View style={styles.solo}>
            <Text style={[styles.h3, { color: colors.text }]}>Just you so far.</Text>
            <Text style={[styles.fine, { color: colors.text }]}>Share the gala code and get your friends in.</Text>
            <Button sm fw={false} label="Share Gala" onPress={() => openSheet('share')} />
          </View>
        ) : null}
        <Lnk label="See everyone" onPress={href('attendance')} />
      </Card>

      <Card bg={brand.zest} shadow={brand.zestDark}>
        <Text style={[styles.h3, { color: brand.tealDark }]}>Gala Code</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Copy gala code ${gala.code}`} onPress={copyCode} style={styles.codebig}>
          <Text style={styles.codebigText}>{gala.code}</Text>
          <Icon name="copy" size={20} color={brand.tealDark} />
        </Pressable>
        <Text style={[styles.fine, { color: brand.tealDark }]}>Friends join with this code.</Text>
      </Card>

      {role === 'leader' ? (
        <Card>
          <Text style={[styles.h3, { color: colors.text }]}>Gala Leader</Text>
          <Text style={[styles.fine, { color: colors.text }]}>Edit details, manage members and access.</Text>
          <Button sm fw={false} variant="teal" icon="sliders" label="Manage gala" onPress={href('settings')} />
        </Card>
      ) : null}
    </>
  );
}

export function Dashboard() {
  const { viewState, liveState, phase, openSheet, setViewState, retry } = useGala();
  const state = viewState !== 'default' ? viewState : liveState;

  return (
    <GalaPage>
      {state === 'loading' ? (
        <Skeleton label="Loading the dashboard" />
      ) : state === 'error' ? (
        <ErrorState
          kind="dashboard"
          onRetry={() => {
            setViewState('default');
            return retry();
          }}
        />
      ) : state === 'empty' ? (
        <Empty kind="dashboard" onAction={() => openSheet('share')} />
      ) : (
        <>
          {state === 'offline' ? <Offline /> : null}
          <Hero />
          {phase !== 'done' ? <RouteStrip /> : null}
          <FeatureGrid />
          <Rail />
        </>
      )}
    </GalaPage>
  );
}

const styles = StyleSheet.create({
  dhero: { borderRadius: 30, padding: 22, gap: 12 },
  h1s: { fontFamily: font.displaySemi, fontSize: 30, lineHeight: 33, letterSpacing: -0.5, color: brand.cream },
  gt: { fontFamily: font.displaySemi, fontSize: 22, color: brand.zest },
  lead: { fontFamily: font.bodyBold, fontSize: 17, lineHeight: 23, color: brand.cream },
  pmeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cdown: { flexDirection: 'row', gap: 10 },
  cbox: { flex: 1, backgroundColor: brand.cream, borderRadius: 20, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 5, borderBottomColor: brand.rosyDark },
  cnum: { fontFamily: font.display, fontSize: 30, lineHeight: 32, color: brand.rosy },
  clabel: { fontFamily: font.bodyHeavy, fontSize: 13, color: brand.tealDark },
  mystat: { gap: 8 },
  mystatLabel: { fontFamily: font.bodyHeavy, fontSize: 14, color: brand.cream },
  seg: { flexDirection: 'row', backgroundColor: brand.cream, borderRadius: 999, padding: 4, gap: 2 },
  segBtn: { flex: 1, borderRadius: 999, paddingVertical: 9, alignItems: 'center' },
  segOn: { backgroundColor: brand.teal, borderBottomWidth: 3, borderBottomColor: brand.tealDark },
  segText: { fontFamily: font.bodyHeavy, fontSize: 14 },

  route: { paddingVertical: 4, gap: 0, alignItems: 'flex-start' },
  rs: { width: 82, alignItems: 'center', gap: 6 },
  rline: { position: 'absolute', top: 19, right: 50, width: 64, height: 4, borderRadius: 2 },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dotCur: { borderBottomWidth: 4, borderBottomColor: brand.rosyDark },
  rl: { fontFamily: font.bodyHeavy, fontSize: 12, textAlign: 'center' },

  fgrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  fcell: { width: '50%', padding: 6 },
  fcard: { padding: 14, gap: 6, minHeight: 190 },
  ico: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  fh: { fontFamily: font.displaySemi, fontSize: 17, lineHeight: 20 },
  fp: { fontFamily: font.bodyBold, fontSize: 13, lineHeight: 18, flexGrow: 1 },

  rh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h3: { fontFamily: font.displaySemi, fontSize: 20 },
  mrow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  mname: { flex: 1, fontFamily: font.bodyHeavy, fontSize: 15 },
  solo: { gap: 6, alignItems: 'flex-start', paddingVertical: 8 },
  fine: { fontFamily: font.body, fontSize: 14, opacity: 0.85 },
  codebig: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: brand.cream, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, alignSelf: 'flex-start' },
  codebigText: { fontFamily: font.display, fontSize: 24, letterSpacing: 1, color: brand.tealDark },
});

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MyRoomDto } from '@/api/types';
import { GalaCard } from '@/components/GalaCard';
import { Icon, type IconName } from '@/components/Icon';
import { Button, Fine, IconButton } from '@/components/ui';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import {
  addMonths,
  dayLabel,
  dowLabel,
  eventsOnDay,
  layoutWeek,
  monthName,
  monthWeeks,
  parts,
  rangeLabel,
  toEvents,
  todayNum,
  weekStartOf,
  type CalEvent,
  type CalGroup,
} from './calendar-model';

/**
 * My Galas' Month / Week calendar (port of otw-client/src/components/me/calendar/CalendarView.tsx; the maths in
 * calendar-model.ts is copied verbatim). Galas spanning several days are one continuous bar per week row.
 */
const MAX_LANES = 2;
const STATUS: Record<CalGroup, { label: string; bg: string; fg: string; icon: IconName }> = {
  upcoming: { label: 'Upcoming', bg: brand.zest, fg: brand.tealDark, icon: 'calendar' },
  ongoing: { label: 'Ongoing', bg: brand.rosy, fg: brand.cream, icon: 'burst' },
  done: { label: 'Completed', bg: brand.teal, fg: brand.cream, icon: 'check' },
};

const openRoom = (room: MyRoomDto) => router.push({ pathname: '/gala/[roomId]', params: { roomId: room.roomId } });

export function CalendarView({ groups, mode }: { groups: { group: CalGroup; rooms: MyRoomDto[] }[]; mode: 'month' | 'week' }) {
  const { colors } = useTheme();
  const { events, undated } = useMemo(() => toEvents(groups as never), [groups]);
  const today = todayNum();
  const [cursor, setCursor] = useState(today);
  const [selected, setSelected] = useState<number | null>(today);
  const here = parts(cursor);
  const weekStart = weekStartOf(cursor);
  const weeks = mode === 'month' ? monthWeeks(here.y, here.m) : [Array.from({ length: 7 }, (_, i) => weekStart + i)];
  const rangeStart = weeks[0][0];
  const rangeEnd = weeks[weeks.length - 1][6];
  const visibleEmpty = !events.some((e) => e.start <= rangeEnd && e.end >= rangeStart);
  const nextGala = visibleEmpty ? events.find((e) => e.start > rangeEnd) : undefined;
  const step = (delta: number) => setCursor((c) => (mode === 'month' ? addMonths(c, delta) : c + delta * 7));
  const first = parts(weeks[0][0]);
  const last = parts(weeks[weeks.length - 1][6]);
  const mon = (m: number) => monthName(m).slice(0, 3);
  const title = mode === 'month' ? monthName(here.m) : first.m === last.m ? `${mon(first.m)} ${first.d}–${last.d}` : `${mon(first.m)} ${first.d}–${mon(last.m)} ${last.d}`;
  const year = mode === 'month' ? here.y : parts(weekStart + 3).y;
  const selectedEvents = selected === null ? [] : eventsOnDay(events, selected);

  return (
    <>
      {events.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.surface2 }]}>
          <Text style={[styles.b, { color: colors.text }]}>Nothing on the calendar yet.</Text>
          <Text style={[styles.fine, { color: colors.text }]}>Sounds like a good time to plan something.</Text>
          <View style={styles.row}>
            <Button sm fw={false} icon="plus" label="Plan a Gala" onPress={() => router.push('/create')} />
            <Button sm fw={false} variant="zest" icon="enter" label="Join a Gala" onPress={() => router.push('/join')} />
          </View>
        </View>
      ) : null}

      <View style={[styles.cal, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.head}>
          <IconButton icon="chevl" label={mode === 'month' ? 'Previous month' : 'Previous week'} onPress={() => step(-1)} />
          <View style={styles.title} accessibilityLiveRegion="polite">
            <Text style={[styles.h3, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.fine, { color: colors.text }]}>{year}</Text>
          </View>
          <IconButton icon="chevr" label={mode === 'month' ? 'Next month' : 'Next week'} onPress={() => step(1)} />
          <Button
            sm
            fw={false}
            variant="zest"
            label="Today"
            onPress={() => {
              setCursor(today);
              setSelected(today);
            }}
          />
        </View>
        {nextGala ? (
          <Pressable accessibilityRole="button" onPress={() => setCursor(nextGala.start)} style={styles.jump}>
            <Text style={[styles.lnk, { color: colors.text }]}>Next gala: {rangeLabel(nextGala.start, nextGala.end)}</Text>
            <Icon name="arrowr" size={16} color={colors.text} />
          </Pressable>
        ) : null}

        <View style={styles.dowRow}>
          {(mode === 'month' ? [0, 1, 2, 3, 4, 5, 6] : weeks[0].map((n) => parts(n).dow)).map((d, i) => (
            <Text key={i} style={[styles.dow, { color: d === 0 || d === 6 ? colors.rosyInk : colors.text }]}>
              {dowLabel(d)}
            </Text>
          ))}
        </View>
        {weeks.map((days) => (
          <WeekRow key={days[0]} days={days} month={mode === 'month' ? here.m : null} today={today} selected={selected} events={events} onSelect={setSelected} />
        ))}

        <View style={styles.legend}>
          {(['upcoming', 'ongoing', 'done'] as const).map((g) => (
            <View key={g} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: STATUS[g].bg }]} />
              <Text style={[styles.fine, { color: colors.text }]}>{STATUS[g].label}</Text>
            </View>
          ))}
          <View style={styles.legendItem}>
            <Icon name="crown" size={14} color={colors.text} />
            <Text style={[styles.fine, { color: colors.text }]}>You lead it</Text>
          </View>
        </View>
      </View>

      {undated > 0 ? (
        <Fine>
          {undated} {undated === 1 ? "gala doesn't" : "galas don't"} have a date yet. {undated === 1 ? "It's" : "They're"} in Upcoming.
        </Fine>
      ) : null}

      {selected !== null ? (
        <View style={{ gap: 12 }}>
          <Text style={[styles.h3, { color: colors.text }]}>
            {dayLabel(selected)}
            {selected === today ? '  · Today' : ''}
          </Text>
          {selectedEvents.length ? (
            selectedEvents.map((e) => <GalaCard key={e.room.roomId} room={e.room as MyRoomDto} group={e.group} />)
          ) : (
            <Text style={[styles.fine, { color: colors.text }]}>
              Wala pang gala dito.{' '}
              <Text style={styles.lnk} onPress={() => router.push('/create')}>
                Plan one
              </Text>
              ?
            </Text>
          )}
        </View>
      ) : null}
    </>
  );
}

function WeekRow({
  days,
  month,
  today,
  selected,
  events,
  onSelect,
}: {
  days: number[];
  month: number | null;
  today: number;
  selected: number | null;
  events: CalEvent[];
  onSelect: (n: number) => void;
}) {
  const { colors } = useTheme();
  const { segments, hidden } = useMemo(() => layoutWeek(days[0], events, MAX_LANES), [days, events]);
  return (
    <View style={styles.wrow}>
      <View style={styles.cells}>
        {days.map((n, i) => {
          const p = parts(n);
          const isToday = n === today;
          const on = selected === n;
          const out = month !== null && p.m !== month;
          return (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${dayLabel(n)}${isToday ? ', today' : ''}`}
              onPress={() => onSelect(n)}
              style={[styles.cell, on && { backgroundColor: colors.surface2 }, out && { opacity: 0.45 }]}>
              <View style={[styles.num, isToday && { backgroundColor: brand.rosy }]}>
                <Text style={[styles.numText, { color: isToday ? brand.cream : colors.text }]}>{p.d}</Text>
              </View>
              {hidden[i] > 0 ? <Text style={[styles.more, { color: colors.text }]}>+{hidden[i]}</Text> : null}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.lanes} pointerEvents="box-none">
        {segments.map((seg) => {
          const st = STATUS[seg.event.group];
          const room = seg.event.room as MyRoomDto;
          return (
            <Pressable
              key={`${room.roomId}-${days[0]}`}
              accessibilityRole="button"
              accessibilityLabel={`Open ${room.title}, ${rangeLabel(seg.event.start, seg.event.end)}, ${st.label}`}
              onPress={() => openRoom(room)}
              style={[
                styles.pill,
                {
                  left: `${(seg.col / 7) * 100}%`,
                  width: `${(seg.span / 7) * 100}%`,
                  top: seg.lane * 20,
                  backgroundColor: st.bg,
                  borderTopLeftRadius: seg.startsHere ? 10 : 0,
                  borderBottomLeftRadius: seg.startsHere ? 10 : 0,
                  borderTopRightRadius: seg.endsHere ? 10 : 0,
                  borderBottomRightRadius: seg.endsHere ? 10 : 0,
                },
              ]}>
              {seg.startsHere ? <Icon name={room.type === 'COUPLE' ? 'heart' : st.icon} size={10} color={st.fg} /> : null}
              <Text style={[styles.pillText, { color: st.fg }]} numberOfLines={1}>
                {room.title}
              </Text>
              {room.myRole === 'HOST' && seg.startsHere ? <Icon name="crown" size={10} color={st.fg} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  b: { fontFamily: font.bodyHeavy, fontSize: 15 },
  fine: { fontFamily: font.bodyBold, fontSize: 13 },
  lnk: { fontFamily: font.bodyHeavy, fontSize: 14, textDecorationLine: 'underline' },
  h3: { fontFamily: font.displaySemi, fontSize: 20 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  empty: { borderRadius: 22, padding: 14, gap: 6 },
  cal: { borderWidth: 3, borderRadius: 26, padding: 10, gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { flex: 1, alignItems: 'center' },
  jump: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
  dowRow: { flexDirection: 'row' },
  dow: { flex: 1, textAlign: 'center', fontFamily: font.bodyHeavy, fontSize: 11 },
  wrow: { minHeight: 76 },
  cells: { flexDirection: 'row', flex: 1 },
  cell: { flex: 1, minHeight: 76, borderRadius: 12, alignItems: 'center', paddingTop: 4 },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: font.bodyHeavy, fontSize: 13 },
  more: { position: 'absolute', bottom: 2, fontFamily: font.bodyHeavy, fontSize: 10 },
  lanes: { position: 'absolute', left: 0, right: 0, top: 32 },
  pill: { position: 'absolute', height: 18, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  pillText: { flex: 1, fontFamily: font.bodyHeavy, fontSize: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', paddingTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});

'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Button, Icon } from '@/components/otw';
import { galaRoute, rememberRoom } from '@/lib/otw/gala-registry';
import type { IconName } from '@/lib/otw/icons';
import { GalaCard } from '../GalaCard';
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
  type Segment,
} from './calendar-model';
import type { MyRoomDto } from '@/lib/api/me';
import s from './calendar.module.css';

/** Two lanes of pills per week row; more show as "+N" and live in the day panel. */
const MAX_LANES = 2;

const STATUS: Record<CalGroup, { label: string; cls: string; icon: IconName }> = {
  upcoming: { label: 'Upcoming', cls: s.pUp, icon: 'calendar' },
  ongoing: { label: 'Ongoing', cls: s.pOn, icon: 'burst' },
  done: { label: 'Completed', cls: s.pDone, icon: 'check' },
};

export interface CalendarViewProps {
  groups: { group: CalGroup; rooms: MyRoomDto[] }[];
  mode: 'month' | 'week';
}

/** The month / week calendar for My Galas. Reads the very galas the Upcoming list shows. */
export function CalendarView({ groups, mode }: CalendarViewProps) {
  const { events, undated } = useMemo(() => toEvents(groups), [groups]);
  const today = todayNum();
  // Any day inside the month / week on screen.
  const [cursor, setCursor] = useState(today);
  const [selected, setSelected] = useState<number | null>(today);

  const here = parts(cursor);
  const weekStart = weekStartOf(cursor);
  const weeks = useMemo(() => (mode === 'month' ? monthWeeks(here.y, here.m) : [Array.from({ length: 7 }, (_, i) => weekStart + i)]), [mode, here.y, here.m, weekStart]);

  const rangeStart = weeks[0][0];
  const rangeEnd = weeks[weeks.length - 1][6];
  const visibleEmpty = !events.some((e) => e.start <= rangeEnd && e.end >= rangeStart);
  const nextGala = visibleEmpty ? events.find((e) => e.start > rangeEnd) : undefined;

  const step = (delta: number) => setCursor((c) => (mode === 'month' ? addMonths(c, delta) : c + delta * 7));
  const goToday = () => {
    setCursor(today);
    setSelected(today);
  };

  const first = parts(weeks[0][0]);
  const last = parts(weeks[weeks.length - 1][6]);
  const mon = (m: number) => monthName(m).slice(0, 3);
  const weekTitle =
    first.m === last.m ? `${mon(first.m)} ${first.d}–${last.d}` : `${mon(first.m)} ${first.d}–${mon(last.m)} ${last.d}`;
  const title = mode === 'month' ? monthName(here.m) : weekTitle;
  const year = mode === 'month' ? here.y : parts(weekStart + 3).y;
  const prevLabel = mode === 'month' ? 'Previous month' : 'Previous week';
  const nextLabel = mode === 'month' ? 'Next month' : 'Next week';

  const selectedEvents = selected === null ? [] : eventsOnDay(events, selected);

  return (
    <>
      {events.length === 0 && (
        <div className={s.empty} role="status">
          <span className={`ico sm ${s.emptyIco}`}>
            <Icon name="calendar" size={20} />
          </span>
          <div>
            <b>Nothing on the calendar yet.</b>
            <span>Sounds like a good time to plan something.</span>
          </div>
          <Link className="btn sm rosy" href="/plan">
            <Icon name="plus" size={16} /> Plan a Gala
          </Link>
          <Link className="btn sm zest" href="/join">
            <Icon name="enter" size={16} /> Join a Gala
          </Link>
        </div>
      )}

      <section className={s.cal} aria-label={mode === 'month' ? 'Month calendar' : 'Week calendar'}>
        <header className={s.head}>
          <button type="button" className={s.nbtn} aria-label={prevLabel} onClick={() => step(-1)}>
            <Icon name="chevl" size={22} />
          </button>
          <div className={s.title} aria-live="polite">
            <h3>{title}</h3>
            <span className={s.year}>{year}</span>
          </div>
          <button type="button" className={s.nbtn} aria-label={nextLabel} onClick={() => step(1)}>
            <Icon name="chevr" size={22} />
          </button>
          <Button variant="zest" sm className={s.todayBtn} onClick={goToday}>
            Today
          </Button>
        </header>

        {nextGala && (
          <button type="button" className={s.jump} onClick={() => setCursor(nextGala.start)}>
            Next gala: {rangeLabel(nextGala.start, nextGala.end)} <Icon name="arrowr" size={16} />
          </button>
        )}

        {mode === 'month' ? (
          <>
            <div className={s.dow} aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <span key={d} className={d === 0 || d === 6 ? s.wknd : undefined}>
                  {dowLabel(d)}
                </span>
              ))}
            </div>
            <div className={s.weeks} key={`m-${here.y}-${here.m}`}>
              {weeks.map((days, wi) => (
                <MonthWeek
                  key={days[0]}
                  index={wi}
                  days={days}
                  month={here.m}
                  today={today}
                  selected={selected}
                  events={events}
                  onSelect={setSelected}
                />
              ))}
            </div>
          </>
        ) : (
          <div className={s.week} key={`w-${weekStart}`}>
            {weeks[0].map((n, i) => (
              <WeekDay key={n} index={i} day={n} today={today} selected={selected} events={events} onSelect={setSelected} />
            ))}
          </div>
        )}

        <ul className={s.legend} aria-label="What the colours mean">
          {(['upcoming', 'ongoing', 'done'] as const).map((g) => (
            <li key={g}>
              <span className={`${s.dot} ${STATUS[g].cls}`} aria-hidden="true" />
              {STATUS[g].label}
            </li>
          ))}
          <li>
            <Icon name="crown" size={14} /> You lead it
          </li>
        </ul>
      </section>

      {undated > 0 && (
        <p className="fine">
          {undated} {undated === 1 ? "gala doesn't" : "galas don't"} have a date yet. {undated === 1 ? "It's" : "They're"} in Upcoming.
        </p>
      )}

      {selected !== null && (
        <section className={s.panel} aria-label={`Galas on ${dayLabel(selected)}`}>
          <h3 className={s.ph}>
            {dayLabel(selected)}
            {selected === today && <span className={s.todayTag}>Today</span>}
          </h3>
          {selectedEvents.length ? (
            <div className={s.plist}>
              {selectedEvents.map((e) => (
                <GalaCard key={e.room.roomId} room={e.room} group={e.group} />
              ))}
            </div>
          ) : (
            <p className="fine">
              Wala pang gala dito. <Link className="lnk" href="/plan">Plan one</Link>?
            </p>
          )}
        </section>
      )}
    </>
  );
}

/* ---------------- month ---------------- */

function MonthWeek({
  index,
  days,
  month,
  today,
  selected,
  events,
  onSelect,
}: {
  index: number;
  days: number[];
  month: number;
  today: number;
  selected: number | null;
  events: CalEvent[];
  onSelect: (n: number) => void;
}) {
  const { segments, hidden } = useMemo(() => layoutWeek(days[0], events, MAX_LANES), [days, events]);
  return (
    <div className={s.wrow}>
      {days.map((n, i) => {
        const p = parts(n);
        const isToday = n === today;
        const has = events.some((e) => e.start <= n && e.end >= n);
        const cls = [s.cell, p.m !== month && s.out, has && s.has, isToday && s.today, selected === n && s.sel].filter(Boolean).join(' ');
        return (
          <button
            key={n}
            type="button"
            className={cls}
            style={{ '--i': index * 7 + i, gridColumn: i + 1 } as CSSProperties}
            aria-pressed={selected === n}
            aria-label={`${dayLabel(n)}${isToday ? ', today' : ''}${has ? ', has a gala' : ''}`}
            onClick={() => onSelect(n)}
          >
            <span className={s.num}>{p.d}</span>
            {hidden[i] > 0 && <span className={s.more}>+{hidden[i]}</span>}
          </button>
        );
      })}
      <div className={s.lanes}>
        {segments.map((seg) => (
          <Pill key={`${seg.event.room.roomId}-${days[0]}`} seg={seg} order={index * 7 + seg.col} />
        ))}
      </div>
    </div>
  );
}

/** One gala as a pill spanning its days within a week row. */
function Pill({ seg, order }: { seg: Segment; order: number }) {
  const { event } = seg;
  const room = event.room;
  const st = STATUS[event.group];
  const leader = room.myRole === 'HOST';
  const icon: IconName = room.type === 'COUPLE' ? 'heart' : st.icon;
  const cls = [s.pill, st.cls, seg.startsHere && s.capL, seg.endsHere && s.capR].filter(Boolean).join(' ');
  return (
    <Link
      href={galaRoute(room.roomCode)}
      onClick={() => rememberRoom(room.roomCode, room.roomId)}
      className={cls}
      style={{ gridColumn: `${seg.col + 1} / span ${seg.span}`, gridRow: seg.lane + 1, '--i': order } as CSSProperties}
      aria-label={`Open ${room.title}, ${rangeLabel(event.start, event.end)}, ${st.label}${leader ? ', you lead it' : ''}`}
      title={`${room.title} · ${rangeLabel(event.start, event.end)}`}
    >
      {seg.startsHere && <Icon name={icon} size={12} />}
      <span className={s.pt}>{room.title}</span>
      {leader && seg.startsHere && <Icon name="crown" size={12} />}
    </Link>
  );
}

/* ---------------- week ---------------- */

function WeekDay({
  index,
  day,
  today,
  selected,
  events,
  onSelect,
}: {
  index: number;
  day: number;
  today: number;
  selected: number | null;
  events: CalEvent[];
  onSelect: (n: number) => void;
}) {
  const p = parts(day);
  const list = eventsOnDay(events, day);
  const isToday = day === today;
  const cls = [s.wd, list.length > 0 && s.has, isToday && s.today, selected === day && s.sel].filter(Boolean).join(' ');
  return (
    <div className={cls} style={{ '--i': index } as CSSProperties}>
      <button
        type="button"
        className={s.wdh}
        aria-pressed={selected === day}
        aria-label={`${dayLabel(day)}${isToday ? ', today' : ''}`}
        onClick={() => onSelect(day)}
      >
        <span className={p.dow === 0 || p.dow === 6 ? s.wknd : undefined}>{dowLabel(p.dow)}</span>
        <span className={s.num}>{p.d}</span>
      </button>
      <div className={s.wl}>
        {list.length ? (
          list.map((e, k) => {
            const seg: Segment = { event: e, col: 0, span: 1, lane: 0, startsHere: true, endsHere: true };
            return <Pill key={e.room.roomId} seg={seg} order={index * 3 + k} />;
          })
        ) : (
          <i className={s.free}>Wala pang gala</i>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, type FormEvent } from 'react';
import { Button, Sheet } from '@/components/otw';
import { addDays } from '@/lib/otw/gala-registry';
import { manilaIso } from '@/lib/otw/time';
import type { StopType } from '@/lib/api/types';
import type { StopInput } from '@/lib/api/gala';

export const STOP_TYPES: { value: StopType; label: string }[] = [
  { value: 'ACTIVITY', label: 'Activity' },
  { value: 'FOOD', label: 'Food' },
  { value: 'MEET_UP', label: 'Meet-up' },
];

export interface AddStopSheetProps {
  /** Gala start (yyyy-mm-dd); a stop's time is on one of the gala's days. */
  startDate?: string;
  days: number;
  /** Sheet title + button label ("Add a Stop", or "Add a place" in Couple Mode). */
  title?: string;
  onAdd: (stop: StopInput) => void | Promise<void>;
  onClose: () => void;
}

/** "Add a Stop" sheet (reference sheet addStop): place, time, type, notes. Multi-day galas also pick the day. */
export function AddStopSheet({ startDate, days, title = 'Add a Stop', onAdd, onClose }: AddStopSheetProps) {
  const [place, setPlace] = useState('');
  const [time, setTime] = useState('16:00');
  const [day, setDay] = useState(0);
  const [type, setType] = useState<StopType>('ACTIVITY');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onAdd({
        title: place.trim() || 'New stop',
        stopType: type,
        notes: note.trim() || null,
        startsAt: startDate && time ? manilaIso(addDays(startDate, day), time) : null,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {title}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} style={{ display: 'contents' }}>
        <label className="fl">
          Place
          <input
            className="in"
            placeholder="Where are we going?"
            maxLength={150}
            value={place}
            onChange={(e) => setPlace(e.target.value)}
          />
        </label>
        <div className="two-in">
          <label className="fl">
            Time
            <input className="in" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label className="fl">
            Type
            <select className="in" value={type} onChange={(e) => setType(e.target.value as StopType)}>
              {STOP_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {startDate && days > 1 && (
          <label className="fl">
            Day
            <select className="in" value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {Array.from({ length: days }, (_, i) => (
                <option key={i} value={i}>
                  Day {i + 1}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="fl">
          Notes (optional)
          <input
            className="in"
            placeholder="Anything people should know"
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </form>
    </Sheet>
  );
}

'use client';

/**
 * Gala dates as one shadcn "date range picker": a Popover trigger showing the chosen range,
 * and a Calendar (react-day-picker, mode="range") inside. Pick one day for a day tour, or a
 * start and an end for an overnight gala. Values are yyyy-mm-dd strings (CreateRoomRequest).
 */
import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromIso = (s: string): Date | undefined => {
  const [y, m, d] = s.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : undefined;
};
const label = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export interface DateRangePickerProps {
  /** yyyy-mm-dd; '' when not picked. */
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  /** Days before this can't be picked. */
  min?: Date;
  /** Classes for the trigger (so it matches the form's inputs). */
  className?: string;
  invalid?: boolean;
  id?: string;
}

export function DateRangePicker({ start, end, onChange, min, className, invalid, id }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const selected: DateRange | undefined = start ? { from: fromIso(start), to: end ? fromIso(end) : undefined } : undefined;

  const text = selected?.from
    ? selected.to && toIso(selected.to) !== toIso(selected.from)
      ? `${label(selected.from)} – ${label(selected.to)}`
      : label(selected.from)
    : 'Pick the date (or dates)';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        aria-invalid={invalid || undefined}
        className={cn('flex w-full items-center gap-3 text-left', !selected?.from && 'opacity-70', className)}
      >
        <CalendarIcon className="size-5 shrink-0" aria-hidden="true" />
        <span className="truncate">{text}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          defaultMonth={selected?.from ?? min}
          selected={selected}
          disabled={min ? { before: min } : undefined}
          onSelect={(range) => {
            const from = range?.from ? toIso(range.from) : '';
            const to = range?.to && range.from && toIso(range.to) !== from ? toIso(range.to) : '';
            onChange(from, to);
          }}
        />
        <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs">
          <span className="text-muted-foreground">Tap one day for a day tour, or a start and an end.</span>
          <button
            type="button"
            className="rounded-md px-2 py-1 font-semibold hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            Done
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

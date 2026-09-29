'use client';

import { FieldError } from './FieldError';

export interface DateValue {
  date: string;
  startTime?: string;
  endTime?: string;
}

export interface StepDateProps {
  value: DateValue;
  onChange: (value: DateValue) => void;
  error?: string;
}

/** Step 2: date plus optional start and end time. */
export function StepDate({ value, onChange, error }: StepDateProps) {
  return (
    <div className="wform">
      <label className="fl">
        Date
        <input
          type="date"
          className={`in${error ? ' bad' : ''}`}
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
          aria-invalid={!!error}
          autoFocus
        />
      </label>
      <div className="two-in">
        <label className="fl">
          Start time (optional)
          <input
            type="time"
            className="in"
            value={value.startTime ?? ''}
            onChange={(e) => onChange({ ...value, startTime: e.target.value })}
          />
        </label>
        <label className="fl">
          End time (optional)
          <input
            type="time"
            className="in"
            value={value.endTime ?? ''}
            onChange={(e) => onChange({ ...value, endTime: e.target.value })}
          />
        </label>
      </div>
      <FieldError error={error} />
    </div>
  );
}

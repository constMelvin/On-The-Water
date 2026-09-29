'use client';

import { Icon } from '@/components/otw';
import { EXAMPLE_TITLE } from '../gala-draft';
import { FieldError } from './FieldError';

export interface StepTitleProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/** Step 1: gala title. */
export function StepTitle({ value, onChange, error }: StepTitleProps) {
  return (
    <div className="wform">
      <input
        className={`in big${error ? ' bad' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={EXAMPLE_TITLE}
        aria-label="Gala title"
        aria-invalid={!!error}
        autoComplete="off"
        autoFocus
      />
      <button type="button" className="chip" onClick={() => onChange(EXAMPLE_TITLE)}>
        <Icon name="sparkle" size={12} /> Use example
      </button>
      <FieldError error={error} />
    </div>
  );
}

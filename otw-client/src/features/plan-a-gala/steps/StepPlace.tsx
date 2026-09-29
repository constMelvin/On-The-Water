'use client';

import { Icon } from '@/components/otw';
import { PLACE_SUGGESTIONS } from '../gala-draft';
import { FieldError } from './FieldError';
import { MiniMap } from './MiniMap';

export interface StepPlaceProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/** Step 3: destination ("Saan Tayo?"). */
export function StepPlace({ value, onChange, error }: StepPlaceProps) {
  // TODO(team): real place search. Replace the plain input with an autocomplete
  // (places API) and keep `onChange(placeName)` as the output.
  return (
    <div className="wform">
      <div className="inwrap">
        <Icon name="search" size={20} />
        <input
          className={`in big ic-in${error ? ' bad' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search a city or place"
          aria-label="Destination"
          aria-invalid={!!error}
          autoComplete="off"
          autoFocus
        />
      </div>
      <div className="chips">
        {PLACE_SUGGESTIONS.map((d) => (
          <button key={d} type="button" className="chip" onClick={() => onChange(d)} aria-pressed={value === d}>
            <Icon name="pin" size={14} /> {d}
          </button>
        ))}
      </div>
      {value.trim() && <MiniMap place={value} />}
      <FieldError error={error} />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Icon } from '@/components/otw';
import { passwordStrength } from '../gala-draft';
import { FieldError } from './FieldError';

export interface PasswordValue {
  password: string;
  confirm: string;
}

export interface StepPasswordProps {
  value: PasswordValue;
  onChange: (value: PasswordValue) => void;
  error?: string;
}

const STRENGTH = ['Add a few characters', 'Okay', 'Good', 'Solid'];

/** Step 4: gala password + confirm, strength meter, code vs password explainer. */
export function StepPassword({ value, onChange, error }: StepPasswordProps) {
  const [show, setShow] = useState(false);
  const n = passwordStrength(value.password);

  return (
    <div className="wform">
      <label className="fl">
        Password
        <div className="inwrap">
          <input
            className={`in big${error ? ' bad' : ''}`}
            type={show ? 'text' : 'password'}
            value={value.password}
            onChange={(e) => onChange({ ...value, password: e.target.value })}
            autoComplete="new-password"
            aria-invalid={!!error}
            autoFocus
          />
          <button
            type="button"
            className="ibtn eye"
            onClick={() => setShow((v) => !v)}
            aria-label="Show or hide password"
            aria-pressed={show}
          >
            <Icon name={show ? 'eyeoff' : 'eye'} size={22} />
          </button>
        </div>
      </label>

      <div className="meter" aria-label="Password strength">
        {[1, 2, 3].map((k) => (
          <i key={k} className={n >= k ? 'on' : undefined} />
        ))}
        <span>{STRENGTH[n]}</span>
      </div>

      <label className="fl">
        Confirm password
        <input
          className="in big"
          type={show ? 'text' : 'password'}
          value={value.confirm}
          onChange={(e) => onChange({ ...value, confirm: e.target.value })}
          autoComplete="new-password"
        />
      </label>

      <div className="explain">
        <div>
          <span className="ico sm">
            <Icon name="sparkle" size={18} />
          </span>
          <p>
            <b>Gala Code</b> identifies your gala. Friends use it to join.
          </p>
        </div>
        <div>
          <span className="ico sm">
            <Icon name="lock" size={18} />
          </span>
          <p>
            <b>Gala Password</b> is private. Use it with the code to come back later.
          </p>
        </div>
      </div>

      <FieldError error={error} />
    </div>
  );
}

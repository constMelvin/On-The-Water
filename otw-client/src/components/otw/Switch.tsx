'use client';

import { cx } from './cx';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name (the switch has no visible text). */
  label: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={cx('sw', checked && 'on', className)}
      onClick={() => onChange(!checked)}
    >
      <i />
    </button>
  );
}

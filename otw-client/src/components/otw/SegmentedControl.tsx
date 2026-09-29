'use client';

import type { IconName } from '@/lib/otw/icons';
import { Icon } from './Icon';
import { cx } from './cx';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. */
  label: string;
  /** Wrapping, full-width variant (.wrapseg). */
  wrap?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  wrap,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={cx('seg', wrap && 'wrapseg', className)} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={16} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

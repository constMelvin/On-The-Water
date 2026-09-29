import { cx } from './cx';

export interface ProgressBarProps {
  /** 0 to 100. */
  value: number;
  /** Accessible name, e.g. "3 of 7 packed". */
  label: string;
  className?: string;
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cx('bar', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

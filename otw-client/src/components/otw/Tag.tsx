import type { ReactNode } from 'react';
import type { IconName } from '@/lib/otw/icons';
import { ST, LOC, type AttendanceKey, type LocationKey } from '@/lib/otw/data';
import { Icon } from './Icon';
import { cx } from './cx';

export type TagVariant =
  | 'zest'
  | 'rosy'
  | 'teal'
  | 'blossom'
  | 'cream'
  | 'st-g'
  | 'st-m'
  | 'st-x'
  | 'l-home'
  | 'l-otw'
  | 'l-almost'
  | 'l-there';

export interface TagProps {
  children: ReactNode;
  /** Default is zest. */
  variant?: TagVariant;
  icon?: IconName;
  iconSize?: number;
  className?: string;
}

export function Tag({ children, variant, icon, iconSize = 14, className }: TagProps) {
  return (
    <span className={cx('tag', variant, className)}>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
    </span>
  );
}

/** Attendance badge: icon + text, never color alone. */
export function StatusBadge({ status }: { status: AttendanceKey }) {
  const s = ST[status];
  return (
    <Tag variant={s.cls} icon={s.i}>
      {s.b}
    </Tag>
  );
}

/** Live location badge (Still at home / On the way / Almost there / Already there). */
export function LocationBadge({ status }: { status: LocationKey }) {
  const l = LOC[status];
  return <Tag variant={l.cls}>{l.l}</Tag>;
}

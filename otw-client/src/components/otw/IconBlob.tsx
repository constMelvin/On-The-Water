import type { CSSProperties } from 'react';
import type { IconName } from '@/lib/otw/icons';
import { Icon } from './Icon';
import { cx } from './cx';

/** Asymmetric radii for a hand-cut feel. Ported from reference/otw/src/proto1.js. */
export const BLOBS = [
  '46% 54% 38% 62% / 50% 42% 58% 50%',
  '58% 42% 55% 45% / 44% 56% 44% 56%',
  '40% 60% 48% 52% / 56% 40% 60% 44%',
  '52% 48% 62% 38% / 46% 58% 42% 54%',
  '44% 56% 40% 60% / 54% 46% 54% 46%',
  '60% 40% 46% 54% / 42% 54% 46% 58%',
];

/** Style for any element that should use blob radius `i` (wraps around). */
export const blob = (i: number): CSSProperties => ({ borderRadius: BLOBS[i % BLOBS.length] });

export interface IconBlobProps {
  name: IconName;
  /** Picks a radius from BLOBS. Omit for the default .ico shape. */
  index?: number;
  size?: 'sm' | 'xl';
  iconSize?: number;
  className?: string;
  style?: CSSProperties;
}

export function IconBlob({ name, index, size, iconSize, className, style }: IconBlobProps) {
  const px = iconSize ?? (size === 'sm' ? 20 : size === 'xl' ? 44 : 26);
  return (
    <span className={cx('ico', size, className)} style={index === undefined ? style : { ...blob(index), ...style }}>
      <Icon name={name} size={px} />
    </span>
  );
}

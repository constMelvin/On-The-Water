import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export type CardTone = 'rosy' | 'zest' | 'teal' | 'blossom' | 'cream';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Adds c-{tone}. On .card this swaps the offset shadow color (the fill stays cream, as in the reference). */
  tone?: CardTone;
  /** Asymmetric blob radius. */
  blob?: boolean;
  /** Hover lift + tilt (hover-capable devices only). */
  lift?: boolean;
  as?: 'div' | 'article' | 'section' | 'li';
}

export function Card({ tone, blob, lift, as: Tag = 'div', className, ...rest }: CardProps) {
  return <Tag className={cx('card', tone && `c-${tone}`, blob && 'blobcard', lift && 'lift', className)} {...rest} />;
}

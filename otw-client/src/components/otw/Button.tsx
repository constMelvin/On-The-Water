import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

export type ButtonVariant = 'rosy' | 'zest' | 'teal' | 'cream' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Smaller pill (16px text, 4px shadow). */
  sm?: boolean;
  /** Square 54px icon-only button. Give it an aria-label. */
  icon?: boolean;
  /** Full width. */
  fw?: boolean;
}

/** Pill button with a solid offset shadow in its own darker tone; squishes on press. */
export function Button({ variant = 'rosy', sm, icon, fw, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={cx('btn', variant, sm && 'sm', icon && 'icon', fw && 'fw', className)} {...rest} />;
}

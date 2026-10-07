'use client';

import { setTheme, useTheme } from '@/lib/otw/theme';
import { Icon } from './Icon';
import { cx } from './cx';

/**
 * Sun / moon button: switches between light and dark and remembers it. Shows the icon of the mode it
 * will switch TO. (The Profile page also offers "Follow my device".)
 */
export function ThemeToggle({ className, size = 22 }: { className?: string; size?: number }) {
  const { resolved } = useTheme();
  const toDark = resolved === 'light';
  const label = toDark ? 'Switch to dark mode' : 'Switch to light mode';
  return (
    <button
      type="button"
      className={cx('ibtn', className)}
      aria-label={label}
      title={label}
      onClick={() => setTheme(toDark ? 'dark' : 'light')}
    >
      <Icon name={toDark ? 'moon' : 'sun'} size={size} />
    </button>
  );
}

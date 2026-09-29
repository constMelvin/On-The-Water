import { IC, type IconName } from '@/lib/otw/icons';

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

/** Inline SVG icon from the OTW set. Decorative: pair it with visible text or an aria-label on the parent. */
export function Icon({ name, size = 24, className }: IconProps) {
  return (
    <svg
      className={className ? `ic ${className}` : 'ic'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: IC[name] }}
    />
  );
}

import { byName, type Tone } from '@/lib/otw/data';
import { cx } from './cx';

export interface AvatarProps {
  /** Member name; the tone is looked up from the member data unless `tone` is given. */
  name: string;
  tone?: Tone;
  size?: number;
  /** Shows the teal online dot. */
  online?: boolean;
  className?: string;
}

/** Colored circle with the member's initial and a 3px cream border. Text color comes from the c-* tone. */
export function Avatar({ name, tone, size = 36, online, className }: AvatarProps) {
  const c = tone ?? byName(name).c;
  return (
    <span
      className={cx('av', `c-${c}`, online && 'on', className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.44) }}
      title={name}
    >
      {name[0]}
    </span>
  );
}

export interface AvatarStackProps {
  names: string[];
  size?: number;
  /** Avatars shown before collapsing the rest into "+N". */
  max?: number;
  className?: string;
}

export function AvatarStack({ names, size = 32, max = 5, className }: AvatarStackProps) {
  const extra = names.length - max;
  return (
    <span className={cx('stack', className)}>
      {names.slice(0, max).map((n) => (
        <Avatar key={n} name={n} size={size} />
      ))}
      {extra > 0 && (
        <span
          className="av c-cream"
          style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
          title={`${extra} more`}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

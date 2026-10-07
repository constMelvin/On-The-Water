'use client';

import { byName, type Tone } from '@/lib/otw/data';
import { useMyLook } from '@/lib/otw/profile';
import { cx } from './cx';

export interface AvatarProps {
  /** Member name; the tone is looked up from the member data unless `tone` is given. */
  name: string;
  tone?: Tone;
  size?: number;
  /** Shows the teal online dot. */
  online?: boolean;
  className?: string;
  /** A photo to show instead of the initial (a small square data URL or image URL). */
  photo?: string;
  /**
   * Whose avatar this is. When it is ME and I saved a photo / colour in my profile (kept on this
   * device), those replace the initial's usual look. The initial still comes from `name`.
   * TODO(backend): once profiles come from the API, every member's photo arrives with the member.
   */
  userId?: string | null;
}

/** Colored circle with the member's initial (or photo) and a 3px cream border. Text color comes from the c-* tone. */
export function Avatar({ name, tone, size = 36, online, className, photo, userId }: AvatarProps) {
  const mine = useMyLook(userId);
  const c = mine?.tone ?? tone ?? byName(name).c;
  const img = photo ?? mine?.photo;
  return (
    <span
      className={cx('av', `c-${c}`, online && 'on', className)}
      // flex: none + a square ratio keep it a perfect circle even if a parent list rule stretches its children.
      style={{ width: size, height: size, flex: 'none', aspectRatio: '1 / 1', fontSize: Math.round(size * 0.44) }}
      title={name}
    >
      {img ? (
        // Plain <img>: a tiny data URL, nothing for next/image to optimise.
        <img
          src={img}
          alt=""
          width={size}
          height={size}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }}
        />
      ) : (
        name[0]
      )}
    </span>
  );
}

export interface AvatarStackPerson {
  name: string;
  /** Lets my own saved photo / colour show up in the stack. */
  userId?: string | null;
  tone?: Tone;
}

export interface AvatarStackProps {
  /** Just names (dev kit, demos). Use `people` when the ids are known. */
  names?: string[];
  people?: AvatarStackPerson[];
  size?: number;
  /** Avatars shown before collapsing the rest into "+N". */
  max?: number;
  className?: string;
}

export function AvatarStack({ names, people, size = 32, max = 5, className }: AvatarStackProps) {
  const list: AvatarStackPerson[] = people ?? (names ?? []).map((name) => ({ name }));
  const extra = list.length - max;
  return (
    <span className={cx('stack', className)}>
      {list.slice(0, max).map((p) => (
        <Avatar key={p.userId ?? p.name} name={p.name} tone={p.tone} userId={p.userId} size={size} />
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

'use client';

import { Avatar, Icon } from '@/components/otw';
import type { Tone } from '@/lib/otw/data';
import { EVERYONE } from '@/lib/otw/mentions';
import s from './chat.module.css';

/** A row the @ picker can offer: a member, or EVERYONE. */
export interface MentionOption {
  userId: string;
  label: string;
  tone?: Tone;
}

/** Most rows the picker shows at once. */
export const MAX_MENTION_ROWS = 6;

/** Rows for an @-query: "everyone" first while it matches, then members whose nickname starts with it. */
export function mentionOptions(query: string, members: MentionOption[]): MentionOption[] {
  const q = query.toLowerCase();
  const out: MentionOption[] = [];
  if (EVERYONE.startsWith(q)) out.push({ userId: EVERYONE, label: EVERYONE });
  for (const m of members) if (m.label.toLowerCase().startsWith(q)) out.push(m);
  return out.slice(0, MAX_MENTION_ROWS);
}

/** The list above the composer while an @-query is being typed. ↑/↓ move, Enter/Tab pick, Esc closes. */
export function MentionPicker({
  id,
  options,
  active,
  memberCount,
  onPick,
}: {
  id: string;
  options: MentionOption[];
  active: number;
  memberCount: number;
  onPick: (o: MentionOption) => void;
}) {
  return (
    <ul className={s.mentions} id={id} role="listbox" aria-label="Mention someone">
      {options.map((o, i) => (
        <li
          key={o.userId}
          id={`${id}-${i}`}
          role="option"
          aria-selected={i === active}
          className={i === active ? s.on : undefined}
          // mousedown, not click: keeps focus in the input.
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(o);
          }}
        >
          {o.userId === EVERYONE ? (
            <>
              <span className={s.mentionall}>
                <Icon name="users" size={18} />
              </span>
              <b>@everyone</b>
              <i>Notify all {memberCount} members</i>
            </>
          ) : (
            <>
              <Avatar name={o.label} tone={o.tone} size={28} userId={o.userId} />
              <b>{o.label}</b>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

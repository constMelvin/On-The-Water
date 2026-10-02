'use client';

import { useState } from 'react';
import { Avatar, Button, Icon } from '@/components/otw';
import type { Member } from '@/lib/otw/data';
import { nameOf } from '@/lib/otw/mock';
import type { ChecklistItemVM } from '@/lib/otw/mock/types';
import s from './checklist.module.css';

export interface ChecklistRowProps {
  item: ChecklistItemVM;
  members: Member[];
  onToggle: () => void;
  onClaim: () => void;
  onDelete: () => void;
}

/** One checklist row (reference .crow): checkbox, label, assignee chip or Claim, delete. */
export function ChecklistRow({ item, members, onToggle, onClaim, onDelete }: ChecklistRowProps) {
  // Pops on each check (not on uncheck, not on first render). Cleared when the animation ends so
  // the next check replays it; the button is never remounted, so keyboard focus stays put.
  const [popping, setPopping] = useState(false);
  const who = item.assignedTo ? nameOf(item.assignedTo) : null;
  const tone = who ? members.find((m) => m.n === who)?.c : undefined;

  return (
    <li className={`${s.crow}${item.isDone ? ` ${s.done}` : ''}`}>
      <button
        type="button"
        className={`cbox${popping ? ` ${s.pop}` : ''}`}
        role="checkbox"
        aria-checked={item.isDone}
        aria-label={item.label}
        onClick={() => {
          if (!item.isDone) setPopping(true);
          onToggle();
        }}
        onAnimationEnd={() => setPopping(false)}
      >
        <Icon name="check" size={18} />
      </button>
      <span className={s.ct}>{item.label}</span>
      {who ? (
        <span className={s.asg}>
          <Avatar name={who} tone={tone} size={24} />
          {who}
        </span>
      ) : (
        <Button variant="zest" sm onClick={onClaim}>
          Claim
        </Button>
      )}
      <button type="button" className="ibtn" onClick={onDelete} aria-label={`Delete ${item.label}`}>
        <Icon name="trash" size={18} />
      </button>
    </li>
  );
}

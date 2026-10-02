'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon, Tag, type TagVariant } from '@/components/otw';
import type { IconName } from '@/lib/otw/icons';
import { dateChip } from '@/lib/otw/date-chip';
import { galaRoute, rememberRoom } from '@/lib/otw/gala-registry';
import type { MyRoomDto } from '@/lib/api/me';
import styles from './me.module.css';

export type CardGroup = 'ongoing' | 'upcoming' | 'done' | 'draw';

/** Status tag per group (reference STAT). */
const STAT: Record<CardGroup, [label: string, variant: TagVariant, icon: IconName]> = {
  ongoing: ['Ongoing', 'l-there', 'burst'],
  upcoming: ['Upcoming', 'st-m', 'calendar'],
  done: ['Completed', 'st-g', 'check'],
  draw: ['Mga Drawing', 'cream', 'notepad'],
};

interface GalaCardProps {
  room: MyRoomDto;
  group: CardGroup;
  /** undefined: the default Open / Recap link. null: no action. Anything else replaces the action. */
  action?: ReactNode;
}

export function GalaCard({ room, group, action }: GalaCardProps) {
  const [label, variant, icon] = STAT[group];
  const leader = room.myRole === 'HOST';
  const chip = dateChip(room.startDate);
  const people = room.memberCount;
  const href = galaRoute(room.roomCode);
  // The gala page resolves code -> roomId through this device's registry; make sure it's there before navigating.
  const remember = () => rememberRoom(room.roomCode, room.roomId);

  const defaultAction =
    group === 'done' ? (
      <Link className="btn sm cream" href={`${href}/recap`} onClick={remember} aria-label={`Recap of ${room.title}`}>
        Recap
      </Link>
    ) : (
      <Link className="btn sm teal" href={href} onClick={remember} aria-label={`Open ${room.title}`}>
        Open
      </Link>
    );

  return (
    <article className={`card ${styles.gcard}`}>
      <span className={styles.gdate} aria-hidden="true">
        {chip ? (
          <>
            {chip.day}
            <i>{chip.mon}</i>
          </>
        ) : (
          <i>TBD</i>
        )}
      </span>
      <div className={styles.gcb}>
        <h3>{room.title}</h3>
        <p>
          <Icon name="pin" size={14} />
          {room.destination}
          <Icon name="users" size={14} />
          {people} {people === 1 ? 'person' : 'people'}
        </p>
        <div className={styles.tags}>
          <Tag variant={variant} icon={icon}>
            {label}
          </Tag>
          <Tag variant={leader ? 'zest' : 'blossom'} icon={leader ? 'crown' : 'user'}>
            {leader ? 'Leader' : 'Member'}
          </Tag>
        </div>
      </div>
      {action === undefined ? defaultAction : action}
    </article>
  );
}

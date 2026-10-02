'use client';

import { Avatar, Card, Icon } from '@/components/otw';
import { useGala } from '@/lib/otw/gala-store';
import s from './chat.module.css';

/** Desktop right panel: "Locked in" summary + "Online now" (reference .chatside). Hidden under 1024px. */
export function ChatSide({ stops }: { stops: number }) {
  const { gala, members, me } = useGala();
  // TODO(backend): presence. Members only carry on=1 for me today (gala-store); real "online now"
  // needs Supabase Realtime presence on room:{roomId}.
  const online = members.filter((m) => m.on === 1);
  return (
    <aside className={s.chatside} aria-label="Gala details">
      <Card>
        <h3>Locked in</h3>
        <p className="fine">{gala.title}</p>
        <ul className={s.mini}>
          {gala.range && (
            <li>
              <Icon name="calendar" size={16} />
              {gala.range}
            </li>
          )}
          {gala.dest && (
            <li>
              <Icon name="pin" size={16} />
              {gala.dest}
            </li>
          )}
          <li>
            <Icon name="route" size={16} />
            {stops} {stops === 1 ? 'stop' : 'stops'}
          </li>
        </ul>
      </Card>
      <Card>
        <h3>Online now</h3>
        <ul className="mlist">
          {online.map((m) => (
            <li key={m.n}>
              <Avatar name={m.n} tone={m.c} size={30} online />
              <span>
                {m.n}
                {m.n === me ? ' (you)' : ''}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </aside>
  );
}

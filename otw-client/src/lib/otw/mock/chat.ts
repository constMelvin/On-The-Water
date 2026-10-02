/**
 * Chat ("Chismis") mock slice. Owned by the chat lane: add actions below.
 * TODO(backend): GET /rooms/{roomId}/chat/messages (paginated) + GET .../chat/unread replace this slice.
 */
import { defineSlice, mockId } from './store';
import { DEMO_ROOM_ID, demoTime, mockUserId } from './members';
import type { ChatMessageVM, ChatVM } from './types';

/**
 * Reference MSG0 (references/otw/src/data.js), ported here because lib/otw/data.ts
 * doesn't have it. k: sys | m | card | new (the "new messages" divider). x: text.
 */
const MSG0: { k: 'sys' | 'm' | 'card' | 'new'; w?: string; x?: string; tm?: string; r?: number; card?: string }[] = [
  { k: 'sys', x: 'Alex joined the gala.', tm: 'Sep 27 · 8:12 PM' },
  { k: 'm', w: 'CJ', x: 'G ako. Sino pa free ng Nov 14?', tm: '8:15 PM' },
  { k: 'm', w: 'Josh', x: 'Me. Pero ang lamig daw sa Baguio, magdadala ako ng jacket.', tm: '8:16 PM', r: 2 },
  { k: 'sys', x: "Sam changed their status to I'm G.", tm: '8:20 PM' },
  { k: 'card', w: 'Jamie', x: 'added a new itinerary stop', card: 'Session Road lunch · 12:30 PM', tm: '8:31 PM' },
  { k: 'new' },
  { k: 'm', w: 'Bea', x: 'Wait, magkano ba per person?', tm: 'Sep 27 · 9:02 PM' },
  { k: 'm', w: 'Merylle', x: 'Check the Gastos tab. Estimate is ₱2,450 each.', tm: '9:03 PM' },
];

function demoChat(): ChatVM {
  const messages: ChatMessageVM[] = [];
  let lastReadAt: string | null = null;
  let prev = '';
  for (const m of MSG0) {
    if (m.k === 'new') {
      lastReadAt = prev; // everything after the divider is unread
      continue;
    }
    const time = (m.tm ?? '').split('·').pop()!.trim();
    const at = demoTime('Sep 27', time);
    prev = at;
    messages.push({
      id: `demo-msg-${messages.length + 1}`,
      roomId: DEMO_ROOM_ID,
      senderUserId: m.w ? mockUserId(m.w) : null,
      kind: m.k === 'sys' ? 'SYSTEM' : m.k === 'card' ? 'CARD' : 'TEXT',
      body: m.x ?? '',
      refType: m.k === 'card' ? 'ITINERARY_ITEM' : null,
      refId: m.k === 'card' ? 'demo-stop-3' : null,
      heartCount: m.r ?? 0,
      reactedByMe: false,
      createdAt: at,
      cardText: m.card,
    });
  }
  return { messages, lastReadAt };
}

export const chat = defineSlice<ChatVM>({
  key: 'chat',
  version: 1,
  empty: () => ({ messages: [], lastReadAt: null }),
  demo: demoChat,
});

/* ---------------- actions ---------------- */

function append(code: string, msg: Omit<ChatMessageVM, 'id' | 'roomId' | 'heartCount' | 'reactedByMe' | 'createdAt'>): void {
  chat.set(code, (c) => ({
    ...c,
    messages: [
      ...c.messages,
      {
        ...msg,
        id: mockId(),
        roomId: c.messages[0]?.roomId ?? '',
        heartCount: 0,
        reactedByMe: false,
        createdAt: new Date().toISOString(),
      },
    ],
  }));
}

/**
 * Sends a TEXT message as `senderUserId` (mockUserId(me) in the mock). Blank text is ignored.
 * Returns false when nothing was sent.
 * TODO(backend): POST /rooms/{roomId}/chat/messages; the server broadcasts chat.message on room:{roomId}
 * after commit. Append optimistically, then swap in the returned ChatMessageDto (skip my own echo).
 */
export function sendMessage(code: string, senderUserId: string, text: string): boolean {
  const body = text.trim();
  if (!body) return false;
  append(code, { senderUserId, kind: 'TEXT', body, refType: null, refId: null });
  return true;
}

/**
 * A SYSTEM line, e.g. "Sam changed their status to I'm G." (reference: the att action).
 * TODO(backend): the server writes system lines itself (e.g. on PATCH .../members/me/rsvp); drop this call then.
 */
export function postSystemLine(code: string, body: string): void {
  append(code, { senderUserId: null, kind: 'SYSTEM', body, refType: null, refId: null });
}

/**
 * Toggles my heart on a message.
 * TODO(backend): POST/DELETE /rooms/{roomId}/chat/messages/{id}/reactions; realtime chat.reaction updates the count.
 */
export function toggleHeart(code: string, messageId: string): void {
  chat.set(code, (c) => ({
    ...c,
    messages: c.messages.map((m) =>
      m.id === messageId
        ? { ...m, reactedByMe: !m.reactedByMe, heartCount: Math.max(0, m.heartCount + (m.reactedByMe ? -1 : 1)) }
        : m
    ),
  }));
}

/**
 * Marks everything up to the newest message as read (the chat view's "N new" divider only).
 * The nav badge does NOT read this: it reads gala-store.unread from GET /summary.
 * TODO(backend): POST /rooms/{roomId}/chat/read (or GET .../chat/unread's cursor) so /summary's unread drops too.
 */
export function markRead(code: string): void {
  chat.set(code, (c) => {
    const newest = c.messages[c.messages.length - 1]?.createdAt ?? null;
    if (!newest || (c.lastReadAt && Date.parse(c.lastReadAt) >= Date.parse(newest))) return c;
    return { ...c, lastReadAt: newest };
  });
}

/** Messages after `lastReadAt` from someone else: what the "N new" divider counts. */
export function unreadAfter(messages: ChatMessageVM[], lastReadAt: string | null, myUserId: string): ChatMessageVM[] {
  const since = lastReadAt ? Date.parse(lastReadAt) : -Infinity;
  return messages.filter((m) => m.senderUserId !== myUserId && Date.parse(m.createdAt) > since);
}

/**
 * Chat @mentions: finding the @-query being typed, inserting a picked member, working out which
 * picked members are still mentioned on send, and splitting a body into text / mention segments
 * for rendering (never HTML). Kept identical in otw-mobile/src/lib/otw/mentions.ts.
 */

/** Someone the composer can mention. label is the nickname, or EVERYONE. */
export interface Mentionable {
  userId: string;
  label: string;
}

export const EVERYONE = 'everyone';

/** Longest @-query we keep the picker open for (nicknames are short). */
const MAX_QUERY = 30;

const WORD_CHAR = /[\p{L}\p{N}_]/u;

/** The @-query being typed at the caret, or null. '@' must start the text or follow whitespace. */
export function activeMentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const start = text.lastIndexOf('@', caret - 1);
  if (start < 0) return null;
  if (start > 0 && !/\s/.test(text[start - 1])) return null;
  const query = text.slice(start + 1, caret);
  if (query.length > MAX_QUERY || query.includes('\n')) return null;
  return { start, query };
}

/** Replaces text[start, caret) with '@label ' and returns the new text and caret. */
export function insertMention(text: string, start: number, caret: number, label: string): { text: string; caret: number } {
  const inserted = `@${label} `;
  return { text: text.slice(0, start) + inserted + text.slice(caret), caret: start + inserted.length };
}

/** Ids of picked members whose '@label' is still in the body. Never includes EVERYONE. */
export function mentionIdsInBody(body: string, picked: Mentionable[]): string[] {
  return picked
    .filter((p) => p.userId !== EVERYONE && splitMentions(body, [{ label: p.label, mine: false }]).some((s) => s.mention))
    .map((p) => p.userId);
}

export function hasEveryone(body: string): boolean {
  return /(^|\s)@everyone(?![\p{L}\p{N}_])/iu.test(body);
}

export type Segment = { text: string; mention?: { mine: boolean } };

/** Splits a body into plain text and @mentions. Labels are tried longest first, case-insensitively. */
export function splitMentions(body: string, labels: { label: string; mine: boolean }[]): Segment[] {
  const sorted = labels.filter((l) => l.label).sort((a, b) => b.label.length - a.label.length);
  const out: Segment[] = [];
  let plain = '';
  let i = 0;
  while (i < body.length) {
    const hit =
      body[i] === '@' && (i === 0 || /\s/.test(body[i - 1]))
        ? sorted.find((l) => {
            const end = i + 1 + l.label.length;
            return (
              body.slice(i + 1, end).toLowerCase() === l.label.toLowerCase() && (end >= body.length || !WORD_CHAR.test(body[end]))
            );
          })
        : undefined;
    if (hit) {
      if (plain) out.push({ text: plain });
      plain = '';
      const end = i + 1 + hit.label.length;
      out.push({ text: body.slice(i, end), mention: { mine: hit.mine } });
      i = end;
    } else {
      plain += body[i];
      i += 1;
    }
  }
  if (plain) out.push({ text: plain });
  return out;
}

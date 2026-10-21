/**
 * Which reaction tabs fit in the "Who reacted" bar and which go under "More". When they don't all
 * fit, one slot is kept for the More tab, so More always holds at least two reactions (never a
 * lone item). Kept identical in otw-mobile/src/lib/otw/reaction-tabs.ts.
 */
export function reactionTabs<T>(
  used: T[],
  max: number,
  active: T | null,
): { visible: T[]; overflow: T[]; activeInOverflow: boolean } {
  if (used.length <= max) return { visible: used, overflow: [], activeInOverflow: false };
  const visible = used.slice(0, max - 1);
  const overflow = used.slice(max - 1);
  return { visible, overflow, activeInOverflow: active !== null && overflow.includes(active) };
}

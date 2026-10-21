/**
 * Swipe-to-reply on a chat bubble: decide early whether a drag is a horizontal swipe or a
 * vertical scroll, and whether the release replies. Kept identical in otw-mobile.
 */

/** Movement (px) before a drag counts as either a swipe or a scroll. */
export const SWIPE_LOCK_PX = 10;
/** Distance (px) toward the screen centre that replies on release. */
export const SWIPE_REPLY_PX = 64;

export function swipeIntent(dx: number, dy: number): 'none' | 'scroll' | 'swipe' {
  if (Math.abs(dx) < SWIPE_LOCK_PX && Math.abs(dy) < SWIPE_LOCK_PX) return 'none';
  return Math.abs(dy) > Math.abs(dx) ? 'scroll' : 'swipe';
}

/** dir is +1 for other people's bubbles (swipe right), -1 for mine (swipe left). */
export function swipeTriggersReply(dx: number, dir: 1 | -1): boolean {
  return dx * dir >= SWIPE_REPLY_PX;
}

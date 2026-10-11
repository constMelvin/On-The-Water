import type { IconName } from '@/lib/otw/icons';
import type { Tone } from '@/lib/otw/data';
import type { AwardKey } from '@/lib/api/types';

/**
 * How each award looks in the app. The titles and blurbs come from the API (one source of truth); only the
 * icon, colour and the wording of the "nominees to consider" hint live here.
 */
export const AWARD_META: Record<AwardKey, { icon: IconName; tone: Tone; hint: (n: number) => string }> = {
  TAGASALBA: { icon: 'wallet', tone: 'rosy', hint: (n) => `paid ${times(n)}` },
  PAMILYA: { icon: 'checklist', tone: 'teal', hint: (n) => `ticked ${n} ${n === 1 ? 'item' : 'items'}` },
  LAGING_G: { icon: 'check', tone: 'zest', hint: () => '' },
  MAPANGARAPIN: { icon: 'route', tone: 'blossom', hint: (n) => `added ${n} ${n === 1 ? 'stop' : 'stops'}` },
  CHISMOSO: { icon: 'chat', tone: 'rosy', hint: (n) => `sent ${n} ${n === 1 ? 'message' : 'messages'}` },
  UNANG_DATING: { icon: 'clock', tone: 'teal', hint: () => '' },
  LATE_ROYALTY: { icon: 'crown', tone: 'zest', hint: () => '' },
  LITRATISTA: { icon: 'camera', tone: 'blossom', hint: (n) => `uploaded ${n} ${n === 1 ? 'photo' : 'photos'}` },
};

function times(n: number) {
  return n === 1 ? 'once' : `${n} times`;
}

/** "Fri, Oct 30, 10:00 AM" */
export const whenLabel = (iso: string) =>
  new Date(iso).toLocaleString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

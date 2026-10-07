import type { TagVariant } from '@/components/otw';
import type { IconName } from '@/lib/otw/icons';
import type { StopType } from '@/lib/api/types';

export interface StopMeta {
  label: string;
  /** Tag colour on the stop card. */
  tag: TagVariant;
  /** Character icon: the same one on the card's tag and on the map pin. */
  icon: IconName;
  /** Pin fill and the icon colour on it (brand tokens). */
  fill: string;
  ink: string;
}

const BY_TYPE: Record<StopType, StopMeta> = {
  MEET_UP: { label: 'Meet-up', tag: 'teal', icon: 'stopMeet', fill: 'var(--teal)', ink: 'var(--cream)' },
  ACTIVITY: { label: 'Activity', tag: 'zest', icon: 'stopActivity', fill: 'var(--zest)', ink: 'var(--teal-dark)' },
  FOOD: { label: 'Food', tag: 'blossom', icon: 'stopFood', fill: 'var(--blossom)', ink: 'var(--teal-dark)' },
};

/** Look of a stop: the preset for its type, or the compass look when the person typed their own type. */
export function metaFor(stopType: StopType, customType?: string): StopMeta {
  if (customType) return { label: customType, tag: 'rosy', icon: 'stopCustom', fill: 'var(--rosy)', ink: 'var(--cream)' };
  return BY_TYPE[stopType] ?? BY_TYPE.ACTIVITY;
}

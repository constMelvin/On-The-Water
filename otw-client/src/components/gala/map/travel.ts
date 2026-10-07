import type { TagVariant } from '@/components/otw';
import type { IconName } from '@/lib/otw/icons';
import type { TravelStatus } from '@/lib/api/rooms';

/** How a travel status looks everywhere on the "Who's OTW?" screen: rows, picker, counts and map pins. */
export interface TravelMeta {
  label: string;
  /** Chip colour (the global l-* tags: home = cream outline, otw = teal, almost = zest, there = rosy). */
  tag: TagVariant;
  icon: IconName;
  /** Short key for the CSS (pin ring + picker button colour). */
  cls: 'home' | 'otw' | 'almost' | 'there';
  /**
   * Counts as "moving": its map pin pulses while it is sharing live.
   * TODO(backend): send speed/heading with locations so "moving" is real, not inferred from the status.
   */
  moving: boolean;
}

export const TRAVEL: Record<TravelStatus, TravelMeta> = {
  STILL_HOME: { label: 'Still at home', tag: 'l-home', icon: 'home', cls: 'home', moving: false },
  ON_THE_WAY: { label: 'On the way', tag: 'l-otw', icon: 'nav', cls: 'otw', moving: true },
  ALMOST_THERE: { label: 'Almost there', tag: 'l-almost', icon: 'sparkle', cls: 'almost', moving: true },
  ARRIVED: { label: 'Already there', tag: 'l-there', icon: 'flag', cls: 'there', moving: false },
};

/** Everyone list order: furthest along first. */
export const ORDER: TravelStatus[] = ['ARRIVED', 'ALMOST_THERE', 'ON_THE_WAY', 'STILL_HOME'];
/** Picker order (reference LOC): home, otw, almost, there. */
export const CHOICES: TravelStatus[] = ['STILL_HOME', 'ON_THE_WAY', 'ALMOST_THERE', 'ARRIVED'];

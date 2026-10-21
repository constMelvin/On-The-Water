import type { IconName } from '@/components/Icon';
import type { ReactionType } from '@/lib/api/types';
import { brand } from '@/theme/tokens';

/** Picker order, icon, label and the brand color each reaction is drawn in. */
export const REACTIONS: { type: ReactionType; icon: IconName; label: string; color: string }[] = [
  { type: 'HEART', icon: 'heart', label: 'Heart', color: brand.rosy },
  { type: 'HAHA', icon: 'haha', label: 'Haha', color: brand.zestDark },
  { type: 'WOW', icon: 'wow', label: 'Wow', color: brand.teal },
  { type: 'SAD', icon: 'sad', label: 'Sad', color: brand.tealDark },
  { type: 'ANGRY', icon: 'angry', label: 'Angry', color: brand.rosyDark },
  { type: 'LIKE', icon: 'like', label: 'Like', color: brand.teal },
];
export const BY_TYPE = new Map(REACTIONS.map((r) => [r.type, r]));

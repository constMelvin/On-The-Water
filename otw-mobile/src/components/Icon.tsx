import { SvgXml } from 'react-native-svg';
import { IC, type IconName } from '@/lib/otw/icons';

/**
 * OTW icons: the web's set (lib/otw/icons.ts, copied verbatim from otw-client). 24px viewBox, 2px rounded stroke,
 * currentColor. Static trusted markup only, never user input. No emoji anywhere in the UI.
 */
export type { IconName };

export function Icon({ name, size = 24, color }: { name: IconName; size?: number; color: string }) {
  const xml =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    IC[name] +
    '</svg>';
  return <SvgXml xml={xml} width={size} height={size} color={color} />;
}

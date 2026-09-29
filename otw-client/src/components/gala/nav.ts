import type { IconName } from '@/lib/otw/icons';

/** A destination inside a gala. `seg` is the path after /gala/[code] ('' = dashboard). */
export interface GalaDest {
  seg: string;
  label: string;
  icon: IconName;
}

/** Sidebar order (reference GNAV). */
export const GNAV: GalaDest[] = [
  { seg: '', label: 'Home', icon: 'home' },
  { seg: 'attendance', label: "Who's G?", icon: 'users' },
  { seg: 'route', label: 'The plan', icon: 'route' },
  { seg: 'budget', label: 'Gastos', icon: 'calc' },
  { seg: 'ambagan', label: 'Ambagan', icon: 'wallet' },
  { seg: 'checklist', label: 'Checklist', icon: 'checklist' },
  { seg: 'chat', label: 'Chismis', icon: 'chat' },
  { seg: 'map', label: "Who's OTW?", icon: 'nav' },
  { seg: 'dump', label: 'Gala Dump', icon: 'image' },
  { seg: 'couple', label: 'Couple Mode', icon: 'heart' },
];

export const SETTINGS: GalaDest = { seg: 'settings', label: 'Settings', icon: 'sliders' };

/** Mobile bottom nav: exactly three (reference GBOT). */
export const GBOT: GalaDest[] = [
  { seg: '', label: 'Home', icon: 'home' },
  { seg: 'chat', label: 'Chat', icon: 'chat' },
  { seg: 'map', label: 'Map', icon: 'map' },
];

/** Plan tab strip on tablet + mobile, shown only on these pages (reference PTABS). */
export const PTABS: GalaDest[] = [
  { seg: 'attendance', label: "Who's G?", icon: 'users' },
  { seg: 'route', label: 'The plan', icon: 'route' },
  { seg: 'budget', label: 'Gastos', icon: 'calc' },
  { seg: 'ambagan', label: 'Ambagan', icon: 'wallet' },
  { seg: 'checklist', label: 'Checklist', icon: 'checklist' },
];

/** More sheet grid (reference sheetHtml 'more'); the last cell depends on account state. */
export const MORE: GalaDest[] = [
  { seg: 'attendance', label: "Who's G?", icon: 'users' },
  { seg: 'route', label: 'The plan', icon: 'route' },
  { seg: 'budget', label: 'Gastos', icon: 'calc' },
  { seg: 'ambagan', label: 'Ambagan', icon: 'wallet' },
  { seg: 'checklist', label: 'Checklist', icon: 'checklist' },
  { seg: 'dump', label: 'Gala Dump', icon: 'image' },
  { seg: 'couple', label: 'Couple Mode', icon: 'heart' },
  { seg: 'settings', label: 'Settings', icon: 'sliders' },
];

export const galaHref = (code: string, seg: string) => `/gala/${encodeURIComponent(code)}${seg ? `/${seg}` : ''}`;

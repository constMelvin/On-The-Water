/**
 * OTW icon set, ported verbatim from reference/otw/src/data.js (`IC`).
 * Hand-drawn, 24px viewBox, 2px rounded stroke, currentColor. `sparkle` is filled.
 * Values are static SVG inner markup (trusted, never user input).
 */
export const IC = {
  sparkle: '<path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="currentColor" stroke="none"/>',
  pin: '<path d="M12 21s-7-7.2-7-12a7 7 0 0 1 14 0c0 4.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.4"/>',
  wallet: '<rect x="3" y="7" width="18" height="12" rx="4"/><path d="M3 10.5h18"/><circle cx="16.5" cy="14.5" r="1.3" fill="currentColor" stroke="none"/>',
  notepad: '<rect x="5" y="3" width="14" height="18" rx="4"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  burst: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>',
  home: '<path d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M10 21v-6h4v6"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M17 14.5c2.5 0 4.5 1.7 4.5 4.5"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="4"/><path d="M8 3v4M16 3v4M4 10h16"/>',
  route: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h6a3 3 0 0 1 0 6h-4a3 3 0 0 0 0 6h6"/>',
  checklist: '<rect x="4" y="4" width="16" height="16" rx="5"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  chat: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-4 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="4"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4 4 3 3-2 4 3"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  share: '<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="3"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/>',
  chevr: '<path d="M9 6l6 6-6 6"/>',
  chevl: '<path d="M15 6l-6 6 6 6"/>',
  chevd: '<path d="M6 9l6 6 6-6"/>',
  chevu: '<path d="M6 15l6-6 6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  arrowr: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  send: '<path d="M4 12l16-8-6 16-3-7z"/>',
  nav: '<path d="M12 3l7 17-7-4-7 4z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  sliders: '<path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>',
  trash: '<path d="M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12"/>',
  edit: '<path d="M4 20l1-5L16 4l4 4L9 19z"/>',
  upload: '<path d="M12 16V5M8 9l4-4 4 4"/><path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".8" fill="currentColor" stroke="none"/>',
  wifioff: '<path d="M3 9a14 14 0 0 1 4-2.5M21 9a14 14 0 0 0-8.5-4M6 12.5a9 9 0 0 1 3-1.8M18 12.5a9 9 0 0 0-4-2.1M9.5 16a4 4 0 0 1 5 0"/><circle cx="12" cy="19" r=".8" fill="currentColor" stroke="none"/><path d="M4 4l16 16"/>',
  crown: '<path d="M4 18l-1-10 5 4 4-7 4 7 5-4-1 10z"/>',
  drag: '<circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>',
  more: '<circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="4"/><path d="M8 8h8M9 13h.01M12 13h.01M15 13h.01M9 17h.01M12 17h.01M15 17h.01"/>',
  flag: '<path d="M6 21V4M6 5h11l-2 4 2 4H6"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v4h-4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".8" fill="currentColor" stroke="none"/>',
  bus: '<rect x="4" y="4" width="16" height="13" rx="4"/><path d="M4 11h16M7 20v-3M17 20v-3"/>',
  food: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2.5-3 5.5S15.5 12 17 12v9"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="3"/><path d="M9 20h6M12 16v4"/>',
  tablet: '<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M11 18.5h2"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="3"/><path d="M11 18.5h2"/>',
  home2: '<path d="M3 12l9-8 9 8"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
} as const;

export type IconName = keyof typeof IC;

export const ICON_NAMES = Object.keys(IC) as IconName[];

/** Same output as the reference `ic()` helper, for DOM-built UI (toast, burst). */
export const icSvg = (name: IconName, size = 24, className = ''): string =>
  `<svg class="ic ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[name]}</svg>`;

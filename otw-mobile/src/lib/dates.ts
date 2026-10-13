/** Date helpers shared with the web (otw-client/src/lib/otw/gala-registry.ts). Gala dates are yyyy-mm-dd. */

function parseDay(iso: string): Date | null {
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

const md = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export function daysBetween(startIso: string, endIso?: string | null): number {
  if (!endIso) return 1;
  const ms = Date.parse(endIso) - Date.parse(startIso);
  return Number.isFinite(ms) ? Math.max(1, Math.round(ms / 86_400_000) + 1) : 1;
}

/** "Nov 14, 2026", "Nov 14–16, 2026", "Nov 30 – Dec 2, 2026". */
export function formatRange(iso: string, days: number): string {
  const start = parseDay(iso);
  if (!start) return '';
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + Math.max(1, days) - 1);
  const y = end.getFullYear();
  if (days <= 1) return `${md(start)}, ${y}`;
  if (start.getFullYear() !== y) return `${md(start)}, ${start.getFullYear()} – ${md(end)}, ${y}`;
  if (start.getMonth() === end.getMonth()) return `${md(start)}–${end.getDate()}, ${y}`;
  return `${md(start)} – ${md(end)}, ${y}`;
}

export const galaDates = (start: string, end?: string | null) => formatRange(start, daysBetween(start, end));

/** Today as yyyy-mm-dd in Manila (gala dates are Manila calendar dates). */
export const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());

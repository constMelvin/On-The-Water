/** "14" + "Nov" from yyyy-mm-dd (local date, no timezone shift). null when there is no usable date. */
export function dateChip(iso: string | null | undefined): { day: number; mon: string } | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { day: d, mon: new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short' }) };
}

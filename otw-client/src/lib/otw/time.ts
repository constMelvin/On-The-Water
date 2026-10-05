/** Gala times are Manila wall-clock times (the server's otw.timezone), whatever the device zone. */
export const TZ = 'Asia/Manila';
const OFFSET = '+08:00';

const fmtTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
const fmtDay = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: TZ });
const fmtShort = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: TZ });
const parts = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: TZ,
});

/** "5:30 AM" */
export const timeLabel = (iso: string) => fmtTime.format(new Date(iso));
/** "Sat, Nov 14" */
export const dayLabel = (iso: string) => fmtDay.format(new Date(iso));
/** "Nov 14" */
export const shortDay = (iso: string) => fmtShort.format(new Date(iso));

/** yyyy-mm-dd + hh:mm (Manila) -> ISO with the +08:00 offset. */
export const manilaIso = (date: string, time: string) => `${date}T${time}:00${OFFSET}`;

/** ISO -> { date: yyyy-mm-dd, time: hh:mm } in Manila. */
export function splitManila(iso: string): { date: string; time: string } {
  const p = Object.fromEntries(parts.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

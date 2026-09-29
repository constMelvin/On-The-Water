/**
 * Toast + sparkle burst. Ported from reference/otw/src/proto1.js.
 * Plain DOM so any component (or event handler) can call them without context.
 */
import { icSvg } from './icons';

export type ToastKind = '' | 'err';

let toastTimer: ReturnType<typeof setTimeout> | undefined;

function toastHost(): HTMLElement {
  let host = document.getElementById('otw-toast');
  if (!host) {
    host = document.createElement('div');
    host.id = 'otw-toast';
    host.className = 'toast-host';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  return host;
}

/** Bottom-center pill that replaces any current toast and clears after ~2.6s. */
export function toast(message: string, kind: ToastKind = ''): void {
  if (typeof document === 'undefined') return;
  const host = toastHost();
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.innerHTML = icSvg(kind === 'err' ? 'alert' : 'check', 18);
  const span = document.createElement('span');
  span.textContent = message;
  t.appendChild(span);

  host.replaceChildren(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => host.replaceChildren(), 2600);
}

const SPARK_COLORS = [
  'var(--zest)',
  'var(--rosy)',
  'var(--cream)',
  'var(--teal)',
  'var(--zest)',
  'var(--rosy)',
  'var(--cream)',
];

/** 7 sparkles flying out from a viewport point, ~700ms. Skipped with reduced motion. */
export function burst(x: number, y: number): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  for (let i = 0; i < 7; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    const a = Math.random() * Math.PI * 2;
    const d = 44 + Math.random() * 52;
    s.style.cssText = `left:${x}px;top:${y}px;--tx:${(Math.cos(a) * d).toFixed(0)}px;--ty:${(Math.sin(a) * d).toFixed(0)}px;color:${SPARK_COLORS[i]}`;
    s.innerHTML = icSvg('sparkle', 16);
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 760);
  }
}

/** Bursts from the center of an element (e.g. the button that was pressed). */
export function burstEl(el: Element | null | undefined): void {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2);
}

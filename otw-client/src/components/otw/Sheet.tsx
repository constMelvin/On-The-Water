'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

export interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Centered modal on tablet/desktop, bottom sheet on mobile (CSS decides).
 * Closes on overlay click, the close button and Escape. Focus is trapped while open
 * and returns to the element that opened it.
 */
export function Sheet({ title, onClose, children, footer }: SheetProps) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const opener = document.activeElement as HTMLElement | null;

    const items = () => Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
    // A control marked data-autofocus (e.g. the safe choice in a confirm) gets focus first.
    (el.querySelector<HTMLElement>('[data-autofocus]') ?? items()[0] ?? el).focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = items();
      if (!list.length) {
        e.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !el.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !el.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener && opener.isConnected) opener.focus();
    };
  }, []);

  return (
    <>
      <div className="ovl" onClick={onClose} aria-hidden="true" />
      <section ref={ref} className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="grab" />
        <header>
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="ibtn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={22} />
          </button>
        </header>
        <div className="shb">{children}</div>
        {footer && <footer>{footer}</footer>}
      </section>
    </>
  );
}

'use client';

import type { MouseEvent } from 'react';
import { useGala } from '@/lib/otw/gala-store';
import { burstEl, toast } from '@/lib/otw/feedback';

/** Click handler that copies the gala code, then toast + sparkle (reference 'copy' action). */
export function useCopyCode() {
  const { gala } = useGala();
  return (e: MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    try {
      navigator.clipboard?.writeText(gala.code).catch(() => {});
    } catch {
      /* clipboard blocked: the toast still confirms the code */
    }
    toast('Gala code copied.');
    burstEl(el);
  };
}

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/otw';
import './plan-a-gala.css';

export type FocusTone = 'rosy' | 'zest' | 'teal' | 'blossom';

export interface FocusLayoutProps {
  tone: FocusTone;
  children: ReactNode;
  /** Where the X goes. Defaults to the landing page. */
  closeHref?: string;
}

/** Full-bleed colored screen with the OTW logo and a round ghost X. No sidebar. */
export function FocusLayout({ tone, children, closeHref = '/' }: FocusLayoutProps) {
  return (
    <div className={`focus bg-${tone}`}>
      <div className="ftop">
        <span className="logo">
          <Icon name="pin" size={26} />
          <b>OTW</b>
        </span>
        <Link className="btn sm ghost iconbtn" href={closeHref} aria-label="Close">
          <Icon name="x" size={20} />
        </Link>
      </div>
      <div className="fbody">{children}</div>
    </div>
  );
}

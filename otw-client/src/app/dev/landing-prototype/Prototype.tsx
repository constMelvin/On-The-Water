'use client';

import { useCallback, useState } from 'react';
import { Closing } from './Closing';
import { Compare } from './Compare';
import { Features } from './Features';
import { Hero, Marquee } from './Hero';
import { JoinModal, PlanModal } from './Modals';
import { Showcase } from './Showcase';
import { Story } from './Story';
import { Logo } from './kit';
import b from './base.module.css';

type Open = null | 'plan' | 'join';

export function Prototype() {
  const [open, setOpen] = useState<Open>(null);
  const close = useCallback(() => setOpen(null), []);
  const plan = useCallback(() => setOpen('plan'), []);
  const join = useCallback(() => setOpen('join'), []);

  return (
    <div className={b.root}>
      <header className={b.nav}>
        <Logo width={64} />
        <nav className={b.navLinks} aria-label="Sections">
          <a href="#story">Story</a>
          <a href="#product">Product</a>
          <a href="#features">Features</a>
        </nav>
        <button type="button" className={b.btn} onClick={plan}>
          Plan a Gala
        </button>
      </header>
      <div className={b.ribbon} role="note">
        <i /> Design prototype. Real landing page untouched.
      </div>
      <main>
        <Hero onPlan={plan} onJoin={join} />
        <Marquee />
        <Compare />
        <Story />
        <Showcase />
        <Features />
        <Closing onPlan={plan} onJoin={join} />
      </main>
      {open === 'plan' && <PlanModal onClose={close} />}
      {open === 'join' && <JoinModal onClose={close} />}
    </div>
  );
}

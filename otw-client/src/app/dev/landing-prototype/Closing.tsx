'use client';

import type { MouseEvent } from 'react';
import { burst } from '@/lib/otw/feedback';
import { Icon, Logo, Reveal } from './kit';
import b from './base.module.css';
import c from './closing.module.css';

export function Closing({ onPlan, onJoin }: { onPlan: () => void; onJoin: () => void }) {
  const pop = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2);
  };
  return (
    <>
      <section className={`${b.section} ${c.section}`} id="start" aria-labelledby="closing-title">
        <span className={`${c.blob} ${c.b1}`} aria-hidden="true" />
        <span className={`${c.blob} ${c.b2}`} aria-hidden="true" />
        <div className={`${b.wrap} ${c.inner}`}>
          <Reveal>
            <h2 id="closing-title" className={c.giant} onClick={pop}>
              <span>G</span> <span className={c.na}>na?</span>
            </h2>
            <p className={c.sub}>Stop saying “tara” in the group chat. Make it a real gala.</p>
            <div className={c.cta}>
              <button type="button" className={`${b.btn} ${b.btnZest}`} onClick={onPlan}>
                Plan a Gala <Icon name="arrow" size={22} />
              </button>
              <button type="button" className={`${b.btn} ${b.btnGhost}`} onClick={onJoin}>
                Join a Gala
              </button>
            </div>
          </Reveal>
        </div>
      </section>
      <footer className={c.footer}>
        <div className={c.fwrap}>
          <div className={c.brand}>
            <Logo width={110} />
            <p>On The Water. Plan the gala, split the ambagan, keep the memories.</p>
          </div>
          <nav className={c.links} aria-label="Footer">
            <a href="#product" onClick={(e) => e.preventDefault()}>Product</a>
            <a href="#features" onClick={(e) => e.preventDefault()}>Features</a>
            <a href="#start" onClick={(e) => e.preventDefault()}>Privacy</a>
            <a href="#start" onClick={(e) => e.preventDefault()}>Contact</a>
          </nav>
        </div>
        <p className={c.note}>Design prototype. Links are inert and nothing is saved.</p>
      </footer>
    </>
  );
}

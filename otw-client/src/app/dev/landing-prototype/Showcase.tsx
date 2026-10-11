'use client';

import { useState, type ReactNode } from 'react';
import { Av, Icon, PEOPLE, Reveal, Wave } from './kit';
import { BudgetPreview, ChatPreview, ChecklistPreview, ItineraryPreview, LocationPreview, PhotosPreview } from './previews';
import b from './base.module.css';
import s from './showcase.module.css';

type Tab = 'plan' | 'budget' | 'checklist' | 'chat' | 'location' | 'photos';

const TABS: { id: Tab; label: string; nav: string; icon: 'route' | 'wallet' | 'list' | 'chat' | 'nav' | 'image'; view: () => ReactNode }[] = [
  { id: 'plan', label: 'Itinerary', nav: 'The plan', icon: 'route', view: () => <ItineraryPreview /> },
  { id: 'budget', label: 'Budget & ambagan', nav: 'Ambagan', icon: 'wallet', view: () => <BudgetPreview /> },
  { id: 'checklist', label: 'Checklist', nav: 'Checklist', icon: 'list', view: () => <ChecklistPreview /> },
  { id: 'chat', label: 'Chat', nav: 'Chismis', icon: 'chat', view: () => <ChatPreview /> },
  { id: 'location', label: 'Location', nav: 'Who’s OTW?', icon: 'nav', view: () => <LocationPreview /> },
  { id: 'photos', label: 'Photos', nav: 'Gala Dump', icon: 'image', view: () => <PhotosPreview /> },
];

const SIDE = ['Home', 'Who’s G?', 'The plan', 'Gastos', 'Ambagan', 'Checklist', 'Chismis', 'Who’s OTW?', 'Gala Dump'];

export function Showcase() {
  const [tab, setTab] = useState<Tab>('plan');
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <section className={`${b.section} ${s.section}`} id="product" aria-labelledby="product-title">
      <div className={b.wrap}>
        <Reveal>
          <span className={b.kicker}>Try it</span>
          <h2 id="product-title" className={b.h2}>
            The whole gala,
            <br />
            <span className={s.rose}>one screen.</span>
          </h2>
          <p className={b.lead}>Poke around. Everything below is clickable, and nothing is saved.</p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className={s.tabs} role="tablist" aria-label="Dashboard previews">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="preview-panel" className={s.tab} onClick={() => setTab(t.id)}>
                <Icon name={t.icon} size={18} /> {t.label}
              </button>
            ))}
          </div>

          <div className={s.frame}>
            <div className={s.chrome} aria-hidden="true">
              <i />
              <i />
              <i />
              <span>OTW-7K2P-ABCD</span>
            </div>
            <div className={s.app}>
              <aside className={s.side} aria-hidden="true">
                <b className={s.sideLogo}>OTW</b>
                <ul>
                  {SIDE.map((x) => (
                    <li key={x} className={x === current.nav ? s.sideOn : ''}>
                      {x}
                    </li>
                  ))}
                </ul>
              </aside>
              <div className={s.main}>
                <header className={s.top}>
                  <span>
                    <b>Tagaytay Barkada</b>
                    <small>Oct 24–25 · 4 people</small>
                  </span>
                  <span className={s.avs} aria-hidden="true">
                    {PEOPLE.map((p) => (
                      <Av key={p.name} n={p.n} tone={p.tone} size={30} />
                    ))}
                  </span>
                </header>
                <div key={tab} id="preview-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className={s.panel}>
                  {current.view()}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
      <Wave top="var(--blossom)" bottom="var(--cream)" />
    </section>
  );
}

'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Avatar,
  AvatarStack,
  Button,
  Card,
  Icon,
  IconBlob,
  ProgressBar,
  SegmentedControl,
  StatusBadge,
  Switch,
  Tag,
  LocationBadge,
} from '@/components/otw';
import { ICON_NAMES } from '@/lib/otw/icons';
import { burstEl, toast } from '@/lib/otw/feedback';
import type { LocationKey } from '@/lib/otw/data';
import s from './kit.module.css';

const SWATCHES: [name: string, token: string, hex: string, use: string][] = [
  ['Rosy', '--rosy', '#e0417c', 'Primary actions, hero, key highlights'],
  ['Rosy dark', '--rosy-dark', '#c22e64', 'Rosy button shadow, pressed states'],
  ['Zest', '--zest', '#f8e140', 'Secondary fills, badges, sparkle'],
  ['Zest dark', '--zest-dark', '#c9b418', 'Zest button shadow'],
  ['Blossom', '--blossom', '#eac7df', 'Soft backgrounds, cards, borders'],
  ['Teal', '--teal', '#2f8aa3', 'Active nav, teal buttons, cool sections'],
  ['Teal dark', '--teal-dark', '#1f6376', 'Body text, footer, teal shadow'],
  ['Cream', '--cream', '#fff8f2', 'Neutral base. Replaces white everywhere'],
];
const LIGHT = ['--zest', '--blossom', '--cream'];

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={s.part}>
      <h3 className={s.partTitle}>{title}</h3>
      {children}
    </section>
  );
}

function Box({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className={s.box}>
      {title && <h4>{title}</h4>}
      {children}
    </div>
  );
}

export default function KitView() {
  const [view, setView] = useState<'upcoming' | 'month' | 'week'>('upcoming');
  const [sw, setSw] = useState(true);
  const [cb, setCb] = useState(true);
  const [showPw, setShowPw] = useState(false);

  return (
    <main>
      <section className={`${s.sec} bg-rosy`}>
        <Link href="/" className="btn sm cream">
          <Icon name="back" size={18} /> Back to OTW
        </Link>
        <h1 className={s.h1}>Design system</h1>
        <p className={s.lead}>One kit, eight brand colors, two typefaces. Same components on every screen size.</p>
      </section>

      <section className={`${s.sec} bg-blossom`}>
        <Part title="Colors">
          <div className={`${s.grid} ${s.swatches}`}>
            {SWATCHES.map(([name, token, hex, use]) => (
              <div key={token} className={s.swatch}>
                <i style={{ background: `var(${token})`, color: LIGHT.includes(token) ? 'var(--teal-dark)' : 'var(--cream)' }}>
                  {token}
                </i>
                <b>{name}</b>
                <span>{hex}</span>
                <span className="fine">{use}</span>
              </div>
            ))}
          </div>
        </Part>

        <Part title="Typography">
          <div className={`${s.grid} ${s.two}`}>
            <Card>
              <span className="fine">Fredoka 600 · display, buttons</span>
              <p className={s.tdisp}>From “G tayo?” to “OTW na.”</p>
              <p className={`${s.tdisp} ${s.tdisp2}`}>Okay, what&apos;s the plan?</p>
              <p className={`${s.tdisp} ${s.tdisp3}`}>Let&apos;s talk gastos.</p>
            </Card>
            <Card>
              <span className="fine">Nunito 600–800 · body</span>
              <p className={s.tb1}>Finally, a place for all those gala plans na ilang buwan nang nasa group chat.</p>
              <p className={s.tb2}>Secondary text, helper copy, and metadata sit at this size and weight.</p>
              <p className="fine">Sentence case throughout. No all-caps labels, no light weights, no serifs.</p>
            </Card>
          </div>
        </Part>

        <Part title="Buttons">
          <div className={`${s.row} ${s.rowBlossom}`}>
            <Button>Plan a Gala</Button>
            <Button variant="zest">Join a Gala</Button>
            <Button variant="teal">Add Photos</Button>
            <Button variant="cream">View Expenses</Button>
            <Button variant="ghost">Maybe Later</Button>
            <Button sm>Small</Button>
            <Button disabled>Disabled</Button>
            <Button icon aria-label="Add">
              <Icon name="plus" size={24} />
            </Button>
          </div>
          <p className={`fine ${s.note}`}>
            Pill shape, solid offset shadow in the button&apos;s own darker tone. Press one: it drops 5px and the shadow
            collapses to 2px.
          </p>
        </Part>

        <Part title="Inputs & controls">
          <div className={`${s.grid} ${s.three}`}>
            <label className="fl">
              Text
              <input className="in" placeholder="Baguio Before Graduation" />
            </label>
            <label className="fl">
              Gala code
              <input className="in code" defaultValue="OTW-7K2P" />
            </label>
            <label className="fl">
              Error
              <input className="in bad" defaultValue="OTW-9999" aria-invalid="true" />
              <span className="ferr sm">
                <Icon name="alert" size={16} />
                Hmm, hindi namin makita &apos;yan. Check the code and try again.
              </span>
            </label>
            <label className="fl">
              Select
              <select className="in">
                <option>Food</option>
                <option>Transportation</option>
              </select>
            </label>
            <div className="fl">
              Password
              <div className="inwrap">
                <input className="in" type={showPw ? 'text' : 'password'} defaultValue="baguio2026" aria-label="Password" />
                <button
                  type="button"
                  className="ibtn eye"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label="Show or hide password"
                >
                  <Icon name={showPw ? 'eyeoff' : 'eye'} size={22} />
                </button>
              </div>
            </div>
            <div className="fl">
              Switch and checkbox
              <div className={s.row}>
                <Switch checked={sw} onChange={setSw} label="Example switch" />
                <button
                  type="button"
                  className={`cbox${cb ? ' on' : ''}`}
                  role="checkbox"
                  aria-checked={cb}
                  aria-label="Example checkbox"
                  onClick={() => setCb((v) => !v)}
                >
                  <Icon name="check" size={18} />
                </button>
              </div>
            </div>
            <div className="fl">
              Segmented tabs
              <SegmentedControl
                label="Calendar view"
                value={view}
                onChange={setView}
                options={[
                  { value: 'upcoming', label: 'Upcoming' },
                  { value: 'month', label: 'Month' },
                  { value: 'week', label: 'Week' },
                ]}
              />
            </div>
            <div className="fl">
              Chips
              <div className="chips">
                <button type="button" className="chip">
                  <Icon name="sparkle" size={12} /> Use example
                </button>
                <button type="button" className="chip">
                  <Icon name="pin" size={14} /> Baguio City
                </button>
              </div>
            </div>
          </div>
        </Part>

        <Part title="Cards">
          <div className={`${s.grid} ${s.three}`}>
            <Card>
              <h3>Base card</h3>
              <p className="fine">Cream, 26px radius, 3px cream border.</p>
            </Card>
            <Card blob>
              <h3>Blob card</h3>
              <p className="fine">Asymmetric radius for a hand-cut feel.</p>
            </Card>
            <Card tone="zest" lift>
              <IconBlob name="route" index={2} />
              <h3>Lift card</h3>
              <p>Lifts and tilts on hover (desktop only)</p>
            </Card>
            <Card tone="teal">
              <h3>Teal card</h3>
              <p className="fine">Cream text on teal.</p>
            </Card>
            <Card tone="rosy">
              <h3>Rosy card</h3>
              <p className="fine">Reserved for headline numbers.</p>
            </Card>
            <Card tone="blossom">
              <h3>Blossom card</h3>
              <p className="fine">c-blossom tone.</p>
            </Card>
          </div>
        </Part>

        <Part title="Badges & statuses">
          <div className={s.row}>
            <StatusBadge status="g" />
            <StatusBadge status="m" />
            <StatusBadge status="x" />
            {(['home', 'otw', 'almost', 'there'] as LocationKey[]).map((k) => (
              <LocationBadge key={k} status={k} />
            ))}
            <Tag variant="zest" icon="crown">
              Gala Leader
            </Tag>
            <Tag variant="blossom" icon="user">
              Member
            </Tag>
            <Tag variant="l-there" icon="nav">
              Sharing on
            </Tag>
            <Tag variant="rosy">Rosy tag</Tag>
            <Tag variant="teal">Teal tag</Tag>
            <Tag variant="cream">Cream tag</Tag>
            <em className="badge">2</em>
          </div>
          <p className={`fine ${s.note}`}>Every status pairs an icon with text. Color never carries meaning alone.</p>
        </Part>

        <Part title="Avatars & icon blobs">
          <div className={s.row}>
            <Avatar name="Merylle" size={48} online />
            <Avatar name="CJ" size={48} />
            <Avatar name="Josh" size={48} />
            <Avatar name="Alex" size={48} />
            <AvatarStack names={['Merylle', 'CJ', 'Josh', 'Alex', 'Sam', 'Bea', 'Jamie']} size={40} max={4} />
          </div>
          <div className={`${s.row} ${s.note}`}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <IconBlob key={i} name="burst" index={i} style={{ background: 'var(--blossom)' }} />
            ))}
            <IconBlob name="pin" size="sm" style={{ background: 'var(--blossom)' }} />
            <IconBlob name="burst" size="xl" index={0} style={{ background: 'var(--zest)' }} />
          </div>
        </Part>

        <Part title="Overlays & feedback">
          <div className={`${s.grid} ${s.three}`}>
            <Box title="Toasts">
              <div className={s.row}>
                <Button variant="teal" sm onClick={() => toast('Gala code copied.')}>
                  Success
                </Button>
                <Button sm onClick={() => toast("Couldn't save. Nothing changed.", 'err')}>
                  Error
                </Button>
              </div>
            </Box>
            <Box title="Sparkle burst">
              <Button variant="zest" sm onClick={(e) => burstEl(e.currentTarget)}>
                Confirm something
              </Button>
              <p className="fine">5 to 7 sparkles, about 700ms, only on confirming actions.</p>
            </Box>
            <Box title="Loading skeleton">
              <div className={s.skel}>
                <div className="sk" style={{ height: 22, width: '60%' }} />
                <div className="sk" style={{ height: 80 }} />
                <div className="sk" style={{ height: 80 }} />
              </div>
            </Box>
          </div>
        </Part>

        <Part title="Progress">
          <div className={`${s.grid} ${s.three}`}>
            <Box title="Bar">
              <ProgressBar value={43} label="43 percent" />
            </Box>
          </div>
        </Part>

        <Part title="Icon set">
          <div className={s.icons}>
            {ICON_NAMES.map((k) => (
              <span key={k} title={k}>
                <Icon name={k} size={26} />
              </span>
            ))}
          </div>
          <p className={`fine ${s.note}`}>Inline SVG, 24px viewBox, 2px rounded stroke, currentColor. No emoji anywhere.</p>
        </Part>
      </section>
    </main>
  );
}

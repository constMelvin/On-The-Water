/**
 * The three standout phone screens: Location sharing, Couple Mode and Barkada Awards. Same rules as scenes.tsx:
 * mock markup only, base CSS = the finished picture, motion plays "from" a start state while the scene is on.
 */
import type { CSSProperties } from 'react';
import { Av, Bar, Check, NavBar, d, type Tone } from './scenes';
import s from './walkthrough.module.css';

const Heart = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </svg>
);

const SparkleIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" />
  </svg>
);

/** A little cup in the brand's linework (the same one the in-app ceremony uses). */
const TrophyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 58" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 6h24v14a12 12 0 0 1-24 0z" fill="var(--zest)" stroke="var(--teal-dark)" />
    <path d="M12 10H6a3 3 0 0 0-3 3c0 6 5 10 10 10M36 10h6a3 3 0 0 1 3 3c0 6-5 10-10 10" stroke="var(--teal-dark)" />
    <path d="M24 32v9M16 52h16M18 41h12l2 11H16z" fill="var(--zest)" stroke="var(--teal-dark)" />
    <path d="M24 11l1.4 4.1 4.1 1.4-4.1 1.4L24 22l-1.4-4.1-4.1-1.4 4.1-1.4z" fill="var(--rosy)" stroke="none" />
  </svg>
);

/* ---- 6. Location sharing: friends' pins go from "still at home" to "arrived" ---- */

type Win = { kind: 'out' | 'win' | 'in'; d: number; dur?: number };
const TRAVEL = ['Still at home', 'On the way', 'Almost there', 'Arrived'];

/** One status line that walks through the app's real travel statuses; its base style is the last one shown. */
function StatusStack({ spec, final }: { spec: (Win | null)[]; final: number }) {
  return (
    <span className={s.stStack}>
      {TRAVEL.map((label, i) => {
        const w = spec[i];
        return (
          <span
            key={label}
            className={`${s.stChip} ${s[`stc${i}`]} ${i === final ? s.stFin : ''} ${w ? s[`w_${w.kind}`] : ''}`}
            style={w ? ({ '--d': `${w.d}s`, '--dur': `${w.dur ?? 0.3}s` } as CSSProperties) : undefined}
          >
            {label}
          </span>
        );
      })}
    </span>
  );
}

/** A friend's pin on the map: dimmed at home, then it travels, and it ends where the base style puts it. */
function Mover({ n, tone, from, via, to, at, dur, rings }: { n: string; tone: Tone; from: [number, number]; via: [number, number]; to: [number, number]; at: number; dur: number; rings: number }) {
  const vars = {
    '--x0': `${from[0]}px`,
    '--y0': `${from[1]}px`,
    '--xm': `${via[0]}px`,
    '--ym': `${via[1]}px`,
    '--x1': `${to[0]}px`,
    '--y1': `${to[1]}px`,
    '--d': `${at}s`,
    '--mdur': `${dur}s`,
    '--rn': rings,
  } as CSSProperties;
  return (
    <div className={`${s.mv} ${s.travel}`} style={vars}>
      <span className={`${s.ring} ${s.ringGo}`} />
      <Av n={n} tone={tone} size={28} />
      <i className={`${s.veil} ${s.veilOff}`} />
    </div>
  );
}

const TRIPS: [string, string, Tone, (Win | null)[], number][] = [
  ['A', 'Ana', 'rosy', [{ kind: 'out', d: 1.4 }, { kind: 'win', d: 1.4, dur: 1.9 }, { kind: 'win', d: 3.0, dur: 1.1 }, { kind: 'in', d: 3.8 }], 3],
  ['B', 'Ben', 'teal', [{ kind: 'out', d: 0.6 }, { kind: 'win', d: 0.6, dur: 2.1 }, { kind: 'win', d: 2.4, dur: 1.1 }, { kind: 'in', d: 3.2 }], 3],
  ['C', 'Cai', 'zest', [{ kind: 'out', d: 2.2 }, { kind: 'in', d: 2.2 }, null, null], 1],
  ['D', 'Dani', 'blossom', [null, null, null, null], 3],
];

export function LocationScene() {
  return (
    <div className={s.body}>
      <div className={s.bar}>
        <b>Who&apos;s OTW?</b>
        <span className={s.live}>
          <i className={s.liveDot} /> Live
        </span>
      </div>

      <div className={s.shareCard}>
        <span className={s.shareText}>
          <b>Share my location</b>
          <small>Opt-in. Stop anytime.</small>
        </span>
        <span className={s.sw}>
          <i className={`${s.swOn} ${s.swFlip}`} style={d(0.3)} />
          <i className={`${s.knob} ${s.knobSlide}`} style={d(0.3)} />
        </span>
      </div>

      <div className={s.lmap}>
        <svg viewBox="0 0 228 188" width="100%" height="100%" aria-hidden="true">
          <rect width="228" height="188" className={s.mapBg} />
          <path d="M0 150c24-12 46 6 72-6s52-26 84-18 52 16 72 8v54H0z" className={s.mapWater} />
          <path d="M-5 56 62 76 150 44 235 66M44 -5 66 195M140 -5 156 195" className={s.mapRoad} />
          <path d="M24 164 C60 128, 90 120, 150 74M22 106 C60 88, 110 86, 150 72M78 178 C110 140, 130 100, 152 74" className={s.trail} />
          <g transform="translate(150 22)">
            <path d="M0 40V0" className={s.flagPole} />
            <path d="M0 2h28l-6 8 6 8H0z" className={s.flagCloth} />
          </g>
        </svg>
        <span className={`${s.meet} ${s.fade}`} style={d(0.2)}>
          Meeting point
        </span>
        <div className={`${s.mv} ${s.dani} ${s.pop}`} style={d(0.2)}>
          <Av n="D" tone="blossom" size={28} />
        </div>
        <Mover n="B" tone="teal" from={[8, 92]} via={[60, 70]} to={[150, 52]} at={0.6} dur={2.7} rings={2} />
        <Mover n="A" tone="rosy" from={[10, 140]} via={[70, 112]} to={[182, 52]} at={1.4} dur={2.5} rings={2} />
        <Mover n="C" tone="zest" from={[64, 148]} via={[80, 130]} to={[96, 108]} at={2.2} dur={3.2} rings={3} />
      </div>

      <ul className={s.trip}>
        {TRIPS.map(([n, name, tone, spec, final]) => (
          <li key={name}>
            <Av n={n} tone={tone} size={22} />
            <b>{name}</b>
            <StatusStack spec={spec} final={final} />
          </li>
        ))}
      </ul>
      <NavBar on="map" />
    </div>
  );
}

/* ---- 7. Couple Mode: a pair, a bucket list item gets checked, a memory appears ---- */

export function CoupleScene() {
  return (
    <div className={s.body}>
      <Bar title="Couple Mode" />

      <div className={s.pairCard}>
        <Av n="A" tone="rosy" size={40} />
        <span className={`${s.heartBadge} ${s.beat}`}>
          <Heart size={14} />
        </span>
        <Av n="J" tone="teal" size={40} />
        <span className={s.pairText}>
          <b>Tagaytay for two</b>
          <small>Couple gala</small>
        </span>
      </div>

      <div className={s.cTabs}>
        <span className={s.cTabOn}>Bucket list</span>
        <span>Halfway</span>
        <span>Quiz</span>
      </div>

      <div className={s.prog}>
        <span className={s.progText}>
          <i className={`${s.pt} ${s.ptOne}`}>1 of 3 done</i>
          <i className={`${s.pt} ${s.ptTwo}`}>2 of 3 done</i>
        </span>
        <span className={s.progBar}>
          <i className={`${s.progFill} ${s.fillTo}`} style={d(1.4)} />
        </span>
      </div>

      <ul className={s.bucket}>
        <li className={s.done}>
          <span className={s.box}>
            <Check size={13} />
          </span>
          <span className={s.bTitle}>Watch the sunrise</span>
          <span className={s.polaroid}>
            <svg viewBox="0 0 30 30" width="30" height="30" aria-hidden="true">
              <rect width="30" height="30" rx="3" fill="var(--blossom)" />
              <circle cx="15" cy="17" r="6" fill="var(--zest)" />
              <path d="M0 24c7-6 13-6 30 0v6H0z" fill="var(--teal)" />
            </svg>
          </span>
        </li>
        <li className={`${s.done} ${s.doneLater}`}>
          <span className={`${s.box} ${s.boxLater}`}>
            <i className={`${s.boxFill} ${s.boxPop}`} style={d(1.2)}>
              <Check size={13} />
            </i>
          </span>
          <span className={s.bTitle}>
            Try a night market
            <i className={`${s.strike} ${s.strikeIn}`} style={d(1.4)} />
          </span>
          <span className={`${s.polaroid} ${s.polaroidB} ${s.pop}`} style={d(2.1)}>
            <svg viewBox="0 0 30 30" width="30" height="30" aria-hidden="true">
              <rect width="30" height="30" rx="3" fill="var(--zest)" />
              <path d="M5 24V13l5-3 5 3 5-3 5 3v11z" fill="var(--rosy)" />
              <circle cx="22" cy="8" r="2.6" fill="var(--cream)" />
            </svg>
          </span>
          <i className={`${s.floatHeart} ${s.hUp}`} style={{ ...d(1.5), left: '56%' }}>
            <Heart size={14} />
          </i>
          <i className={`${s.floatHeart} ${s.hUp}`} style={{ ...d(1.75), left: '68%' }}>
            <Heart size={11} />
          </i>
          <i className={`${s.floatHeart} ${s.hUp}`} style={{ ...d(1.95), left: '62%' }}>
            <Heart size={9} />
          </i>
        </li>
        <li>
          <span className={`${s.box} ${s.boxOpen}`} />
          <span className={s.bTitle}>Road trip to Batangas</span>
        </li>
      </ul>
      <NavBar on="home" />
    </div>
  );
}

/* ---- 8. Barkada Awards: a vote, the poll closes, a winner is revealed, a certificate arrives ---- */

const BURST = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return { tx: Math.round(Math.cos(a) * 62), ty: Math.round(Math.sin(a) * 62) };
});

const CANDS: [string, string, Tone][] = [
  ['A', 'Ana', 'rosy'],
  ['B', 'Ben', 'teal'],
  ['C', 'Cai', 'zest'],
];

export function AwardsScene() {
  return (
    <div className={s.awRoot}>
      {/* 1. the ballot: results stay hidden until voting closes */}
      <div className={`${s.awBallot} ${s.awBallotOut}`}>
        <div className={s.body}>
          <Bar title="Barkada Awards" />
          <div className={s.awCard}>
            <span className={s.awIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="7" width="18" height="12" rx="4" />
                <path d="M3 10.5h18" />
              </svg>
            </span>
            <b>Ang Tagasalba</b>
            <small>Laging unang nag-abono para umandar ang gala.</small>
          </div>
          <div className={s.awPick}>
            {CANDS.map(([n, name, tone]) => (
              <span key={name} className={`${s.awCand} ${name === 'Ben' ? s.awCandOn : ''}`}>
                <Av n={n} tone={tone} size={38} />
                <b>{name}</b>
                {name === 'Ben' && (
                  <i className={`${s.awTick} ${s.pop}`} style={d(0.9)}>
                    <Check size={11} />
                  </i>
                )}
              </span>
            ))}
          </div>
          <div className={s.awMeta}>
            <b>3 of 4 voted</b>
            <small>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="11" width="14" height="9" rx="3" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              Results show when voting closes
            </small>
          </div>
          <span className={`${s.stamp} ${s.stampIn}`} style={d(2.3)}>
            Voting closed
          </span>
        </div>
      </div>

      {/* 2. the reveal */}
      <div className={`${s.awStage} ${s.awStageIn}`}>
        <span className={s.awLabel}>
          <TrophyIcon className={s.awLabelIcon} /> Ang Tagasalba
        </span>
        <div className={s.awDrum} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className={`${s.awWinner} ${s.awWinnerIn}`}>
          <TrophyIcon className={`${s.awTrophy} ${s.awTrophyIn}`} />
          <Av n="B" tone="teal" size={68} />
          <span className={s.awBody} />
          <span className={s.awSteps}>
            <i />
            <i />
          </span>
          <b className={`${s.awName} ${s.fade}`} style={d(5.1)}>
            Ben
          </b>
          {BURST.map((b, i) => (
            <i key={i} className={`${s.awSpark} ${s.awSparkOut}`} style={{ '--tx': `${b.tx}px`, '--ty': `${b.ty}px`, '--d': '4.9s' } as CSSProperties}>
              <SparkleIcon size={i % 2 ? 11 : 15} />
            </i>
          ))}
        </div>
      </div>

      {/* 3. the certificate */}
      <div className={`${s.awCert} ${s.certUp}`} style={d(5.8)}>
        <span className={s.certBrand}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 21s-7-7.2-7-12a7 7 0 0 1 14 0c0 4.8-7 12-7 12z" />
            <circle cx="12" cy="9" r="2.4" fill="var(--cream)" />
          </svg>
          OTW
        </span>
        <small>Sertipiko ng Parangal</small>
        <Av n="B" tone="teal" size={42} />
        <span className={s.certSmall}>Pinarangalan si</span>
        <b className={s.certName}>Ben</b>
        <span className={s.certPill}>Ang Tagasalba</span>
        <i className={s.certSeal}>
          <SparkleIcon size={12} />
        </i>
      </div>
    </div>
  );
}

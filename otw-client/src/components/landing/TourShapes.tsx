/**
 * The landing page's "living background" (big, low-opacity shapes from the logo and rising confetti), reused
 * behind the tour so it carries the celebration the old closing banner had. It draws with the page's own shape
 * sprite (<ShapeDefs/> in the landing page, so no extra SVG ships) and the landing's shape styles, and it is
 * cream-based so it reads on every step colour. Paused whenever the tour is off screen (see walkthrough.module.css).
 */
import type { CSSProperties } from 'react';
import landing from '@/app/landing.module.css';

type Kind = 'spark' | 'blob' | 'noodle' | 'pill' | 'ring' | 'squiggle' | 'burst' | 'dot' | 'glow';
type Motion = 'drift' | 'breathe' | 'spin' | 'sway' | 'twinkle' | 'rise';
type ToneName = 'rosy' | 'rosy-dark' | 'zest' | 'zest-dark' | 'blossom' | 'teal' | 'teal-dark' | 'cream';

interface Shape {
  k: Kind;
  l: string;
  t: string;
  w: number;
  c: ToneName;
  o: number;
  a: Motion;
  dur: number;
  dl?: number;
  z?: number;
  r?: number;
}

const VIEWBOX: Record<Exclude<Kind, 'glow'>, string> = {
  spark: '0 0 24 24',
  blob: '0 0 100 100',
  noodle: '0 0 120 120',
  pill: '0 0 160 70',
  ring: '0 0 100 100',
  squiggle: '0 0 160 40',
  burst: '0 0 100 100',
  dot: '0 0 10 10',
};

const sh = (k: Kind, l: string, t: string, w: number, c: ToneName, o: number, a: Motion, dur: number, x: Partial<Shape> = {}): Shape => ({ k, l, t, w, c, o, a, dur, ...x });

const SHAPES: Shape[] = [
  // big soft shapes down the length of the tour
  sh('glow', '30%', '2%', 560, 'cream', 0.3, 'drift', 22, { z: 8 }),
  sh('blob', '-4%', '4%', 320, 'cream', 0.1, 'drift', 20, { z: 18 }),
  sh('spark', '88%', '3%', 170, 'cream', 0.2, 'spin', 28, { z: 32 }),
  sh('ring', '16%', '12%', 110, 'cream', 0.2, 'breathe', 16, { z: 26 }),
  sh('burst', '74%', '20%', 110, 'cream', 0.2, 'spin', 24, { z: 34 }),
  sh('spark', '5%', '30%', 140, 'cream', 0.14, 'spin', 30, { dl: -4, z: 30 }),
  sh('noodle', '80%', '40%', 250, 'cream', 0.1, 'sway', 22, { r: 20, dl: -5, z: 24 }),
  sh('pill', '4%', '52%', 280, 'cream', 0.16, 'sway', 18, { z: 20 }),
  sh('ring', '84%', '62%', 120, 'cream', 0.18, 'breathe', 17, { dl: -3, z: 26 }),
  sh('squiggle', '10%', '72%', 210, 'cream', 0.18, 'sway', 14, { z: 30 }),
  sh('blob', '70%', '78%', 340, 'cream', 0.1, 'drift', 24, { dl: -6, z: 18 }),
  // little stars that twinkle
  sh('spark', '24%', '8%', 30, 'cream', 0.7, 'twinkle', 3.4, { z: 46 }),
  sh('spark', '92%', '26%', 26, 'cream', 0.6, 'twinkle', 4, { dl: -1.2, z: 50 }),
  sh('spark', '12%', '44%', 24, 'cream', 0.6, 'twinkle', 3.2, { dl: -0.6, z: 48 }),
  sh('spark', '90%', '56%', 28, 'cream', 0.65, 'twinkle', 3.8, { dl: -2, z: 44 }),
  sh('spark', '20%', '66%', 26, 'cream', 0.6, 'twinkle', 4.2, { dl: -1, z: 46 }),
  sh('spark', '84%', '84%', 24, 'cream', 0.6, 'twinkle', 3.6, { dl: -2.4, z: 50 }),
  // celebration confetti rising behind the closing call to action
  sh('dot', '30%', '93%', 14, 'rosy', 0.55, 'rise', 7, { z: 40 }),
  sh('dot', '42%', '95%', 10, 'cream', 0.8, 'rise', 9, { dl: -3, z: 44 }),
  sh('dot', '56%', '94%', 16, 'teal', 0.45, 'rise', 8, { dl: -5, z: 38 }),
  sh('dot', '66%', '96%', 12, 'rosy', 0.55, 'rise', 10, { dl: -1.5, z: 46 }),
  sh('spark', '36%', '91%', 24, 'rosy', 0.55, 'rise', 8.5, { dl: -6, z: 42 }),
  sh('spark', '60%', '92%', 22, 'cream', 0.85, 'rise', 7.5, { dl: -2.5, z: 40 }),
];

export function TourShapes() {
  return (
    <div className={landing.bg} aria-hidden="true">
      {SHAPES.map((s, i) => {
        const style = {
          '--l': s.l,
          '--t': s.t,
          '--w': `${s.w}px`,
          '--c': `var(--${s.c})`,
          '--o': s.o,
          '--r': `${s.r ?? 0}deg`,
          '--dur': `${s.dur}s`,
          '--dl': `${s.dl ?? 0}s`,
          '--z': s.z ?? 14,
        } as CSSProperties;
        const cls = `${landing.shape} ${landing[s.a]}`;
        return (
          <span key={i} className={landing.px} style={style}>
            {s.k === 'glow' ? (
              <span className={`${cls} ${landing.glow}`} />
            ) : (
              <svg className={cls} viewBox={VIEWBOX[s.k]} focusable="false">
                <use href={`#otw-${s.k}`} />
              </svg>
            )}
          </span>
        );
      })}
    </div>
  );
}

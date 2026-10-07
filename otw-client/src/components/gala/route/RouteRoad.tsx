'use client';

import { useId, useSyncExternalStore } from 'react';
import { IC } from '@/lib/otw/icons';
import type { StopType } from '@/lib/api/types';
import { MAP_TILE_H, MAP_W, MapArt } from './MapArt';
import { metaFor } from './stop-style';
import s from './route-road.module.css';

const PAD_X = 40;
const PER_ROW = 7;
const ROW_H = 96;
const WAVE = 26;
const DRAW_S = 1.6;

export interface RoadStop {
  id: string;
  title: string;
  stopType: StopType;
  /** The person's own type, when they typed one. */
  customType?: string;
}

type Pt = [number, number];

/** Waypoints for every stop: a gentle wave across the map, wrapping into rows (alternating direction) after PER_ROW stops. */
function layout(n: number): { pts: Pt[]; height: number } {
  if (n === 1) return { pts: [[MAP_W / 2, MAP_TILE_H / 2]], height: MAP_TILE_H };
  const rows = Math.ceil(n / PER_ROW);
  const perRow = Math.min(n, PER_ROW);
  const step = (MAP_W - 2 * PAD_X) / (perRow - 1);
  const height = rows === 1 ? MAP_TILE_H : 140 + (rows - 1) * ROW_H;
  const base = rows === 1 ? MAP_TILE_H / 2 : 70;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / PER_ROW);
    const c = i % PER_ROW;
    const x = r % 2 === 0 ? PAD_X + c * step : MAP_W - PAD_X - c * step;
    pts.push([x, base + r * ROW_H + Math.sin(i * 1.3 + 0.5) * WAVE]);
  }
  return { pts, height };
}

/** One smooth curve through every point (Catmull-Rom turned into cubic Béziers). */
function smoothPath(pts: Pt[]): string {
  if (pts.length === 1) {
    const [x, y] = pts[0];
    return `M${x - 50} ${y + 14}Q${x} ${y} ${x + 50} ${y - 14}`;
  }
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const prefersCalm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The route as an illustrated mini-map: one smooth winding road through a map scene, with the
 * numbered stops (type icon + number) sitting on it. The route draws itself in, each pin pops as
 * the line reaches it, and a traveler glides along it. Stylized on purpose: the stop list carries
 * the real data. Reduced motion: the final picture, no animation, no traveler.
 */
export function RouteRoad({ stops, label }: { stops: RoadStop[]; label: string }) {
  const pathId = `road-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const calm = useSyncExternalStore(subscribeMotion, prefersCalm, () => false);
  const n = stops.length;
  if (n === 0) return null;

  const { pts, height } = layout(n);
  const d = smoothPath(pts);
  const travelS = Math.max(8, n * 2.2);

  return (
    <svg className={s.road} viewBox={`0 0 ${MAP_W} ${height}`} role="img" aria-label={label}>
      <MapArt height={height} />
      <path className={s.casing} d={d} pathLength={1} />
      <path id={pathId} className={s.asphalt} d={d} pathLength={1} />
      {stops.map((st, i) => {
        const [x, y] = pts[i];
        const meta = metaFor(st.stopType, st.customType);
        return (
          <g key={st.id} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
            <title>{`${i + 1}. ${st.title}`}</title>
            <g className={s.pin} style={{ animationDelay: `${(0.05 + DRAW_S * (n === 1 ? 0 : i / (n - 1))).toFixed(2)}s` }}>
              <circle r="16" className={s.disc} style={{ fill: meta.fill }} />
              <svg
                x={-8}
                y={-8}
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: meta.ink }}
                dangerouslySetInnerHTML={{ __html: IC[meta.icon] }}
              />
              <g transform="translate(12 -12)">
                <circle r="8" className={s.badge} />
                <text className={s.num}>{i + 1}</text>
              </g>
            </g>
          </g>
        );
      })}
      {!calm && (
        <g className={s.traveler}>
          <circle r="9" className={s.ring} />
          <circle r="6" className={s.dot} />
          <circle r="2.6" className={s.core} />
          <animateMotion dur={`${travelS}s`} begin={`${DRAW_S + 0.3}s`} repeatCount="indefinite" rotate="auto">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </g>
      )}
    </svg>
  );
}

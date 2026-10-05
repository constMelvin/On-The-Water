import s from './map-art.module.css';

/**
 * The reference's illustrated map (proto2.js mapSvg): blocks, roads, water, the dashed route
 * and the destination flag. Decorative: the stop list next to it carries the real data.
 */
export function MapArt({ route = true, flag = true, label }: { route?: boolean; flag?: boolean; label: string }) {
  return (
    <svg className={s.map} viewBox="0 0 600 380" role="img" aria-label={label}>
      <rect width="600" height="380" className={s.bg} />
      <path d="M330 312q40-64 112-42t92 74q-74 40-204-32z" className={s.water} />
      <g className={s.blocks}>
        <rect x="40" y="150" width="70" height="60" rx="14" />
        <rect x="230" y="40" width="90" height="70" rx="14" />
        <rect x="330" y="200" width="70" height="60" rx="14" />
        <rect x="500" y="220" width="70" height="80" rx="14" />
        <rect x="120" y="230" width="60" height="50" rx="14" />
        <rect x="420" y="20" width="80" height="50" rx="14" />
      </g>
      <g className={s.roads}>
        <path d="M0 300Q150 250 260 200T600 96" />
        <path d="M118 0Q160 160 204 380" />
        <path d="M40 130L600 210" />
        <path d="M340 0Q360 160 330 380" />
      </g>
      {route && <path className={s.route} d="M78 88Q200 130 260 204T468 116" />}
      {flag && (
        <g transform="translate(474 112)">
          <circle r="20" className={s.flag} />
          <path d="M-5 9V-9M-5-8h11l-2.4 4.5L6 1H-5" className={s.flagI} />
        </g>
      )}
    </svg>
  );
}

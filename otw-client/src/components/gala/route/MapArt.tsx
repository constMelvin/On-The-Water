import s from './map-art.module.css';

/** Width and height of one scene tile. A tall route repeats the tile, mirrored, so the seams line up. */
export const MAP_W = 360;
export const MAP_TILE_H = 230;

function Tile({ first }: { first: boolean }) {
  return (
    <>
      {/* water: a bay at the bottom right and a river across the top */}
      <path d="M250 230C262 196 308 178 360 184V230z" className={s.water} />
      <path d="M-10 28C50 52 96 8 168 34S300 70 370 40" className={s.river} />
      {/* greenery */}
      <ellipse cx="62" cy="172" rx="40" ry="24" className={s.park} />
      <ellipse cx="300" cy="64" rx="30" ry="19" className={s.park} />
      <circle cx="48" cy="166" r="4" className={s.tree} />
      <circle cx="68" cy="178" r="4.5" className={s.tree} />
      <circle cx="80" cy="164" r="3.5" className={s.tree} />
      <circle cx="292" cy="62" r="3.5" className={s.tree} />
      <circle cx="308" cy="68" r="4" className={s.tree} />
      {/* blocks */}
      <g className={s.blocks}>
        <rect x="24" y="88" width="56" height="40" rx="12" />
        <rect x="118" y="152" width="64" height="44" rx="12" />
        <rect x="196" y="98" width="50" height="38" rx="12" />
        <rect x="262" y="124" width="60" height="36" rx="12" />
        <rect x="112" y="64" width="52" height="30" rx="12" />
        <rect x="206" y="172" width="36" height="34" rx="12" />
      </g>
      {/* roads */}
      <g className={s.roads}>
        <path d="M-10 190Q110 150 200 120T370 60" />
        <path d="M96 -10Q120 100 150 240" />
        <path d="M-10 124L370 152" />
        <path d="M254 -10Q266 100 240 240" />
      </g>
      <circle cx="334" cy="26" r="7" className={s.sun} />
      {first && (
        <g transform="translate(26 26)">
          <circle r="14" className={s.compass} />
          <path d="M0 -9L4 0H-4z" className={s.needle} />
          <path d="M0 9L4 0H-4z" className={s.needleS} />
        </g>
      )}
    </>
  );
}

/** The map scene (land, water, greenery, blocks, roads) for an SVG that is MAP_W wide and `height` tall. */
export function MapArt({ height }: { height: number }) {
  const tiles = Math.max(1, Math.ceil(height / MAP_TILE_H));
  return (
    <g aria-hidden="true">
      <rect width={MAP_W} height={height} className={s.bg} />
      {Array.from({ length: tiles }, (_, r) => (
        <g
          key={r}
          transform={r % 2 ? `translate(0 ${(r + 1) * MAP_TILE_H}) scale(1 -1)` : `translate(0 ${r * MAP_TILE_H})`}
        >
          <Tile first={r === 0} />
        </g>
      ))}
    </g>
  );
}

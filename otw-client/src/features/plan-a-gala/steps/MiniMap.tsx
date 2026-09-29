import { Icon } from '@/components/otw';

/**
 * Static illustrated map preview (reference mapSvg with flag, "slice" fit).
 * TODO(team): swap for a real map preview of the chosen place if you want one.
 */
export function MiniMap({ place }: { place: string }) {
  return (
    <div className="minimap">
      <svg className="map" viewBox="0 0 600 380" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Map preview">
        <rect width="600" height="380" className="m-bg" />
        <path d="M330 312q40-64 112-42t92 74q-74 40-204-32z" className="m-water" />
        <g className="m-blocks">
          <rect x="40" y="150" width="70" height="60" rx="14" />
          <rect x="230" y="40" width="90" height="70" rx="14" />
          <rect x="330" y="200" width="70" height="60" rx="14" />
          <rect x="500" y="220" width="70" height="80" rx="14" />
          <rect x="120" y="230" width="60" height="50" rx="14" />
          <rect x="420" y="20" width="80" height="50" rx="14" />
        </g>
        <g className="m-roads">
          <path d="M0 300Q150 250 260 200T600 96" />
          <path d="M118 0Q160 160 204 380" />
          <path d="M40 130L600 210" />
          <path d="M340 0Q360 160 330 380" />
        </g>
        <g transform="translate(474 112)">
          <circle r="20" className="m-flag" />
          <path d="M-5 9V-9M-5-8h11l-2.4 4.5L6 1H-5" className="m-flag-i" />
        </g>
      </svg>
      <span>
        <Icon name="pin" size={16} /> {place}
      </span>
    </div>
  );
}

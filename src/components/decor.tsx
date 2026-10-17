// Dreamy watercolor decorations — original, hand-crafted inline SVGs.
// Always decorative: aria-hidden, never interactive, never over text.
// Colors come from theme variables so they adapt to the page theme.

interface DecorProps {
  className?: string;
}

/** Soft pigment-wash blob for page corners. */
export function WashCorner({ className = '' }: DecorProps) {
  return (
    <svg
      className={`decor ${className}`}
      viewBox="0 0 220 220"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="dd-blur-wash" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>
      <g filter="url(#dd-blur-wash)" opacity="0.55">
        <ellipse cx="72" cy="82" rx="62" ry="50" fill="var(--blush)" />
        <ellipse cx="122" cy="58" rx="46" ry="38" fill="var(--powder)" opacity="0.75" />
        <ellipse cx="96" cy="118" rx="40" ry="32" fill="var(--peach)" opacity="0.7" />
        <ellipse cx="60" cy="130" rx="30" ry="24" fill="var(--sage)" opacity="0.5" />
      </g>
    </svg>
  );
}

/** Minimal botanical sprig — stem with soft leaves. */
export function Sprig({ className = '' }: DecorProps) {
  return (
    <svg
      className={`decor ${className}`}
      viewBox="0 0 120 180"
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="none"
        stroke="var(--sage)"
        strokeLinecap="round"
        opacity="0.65"
      >
        <path d="M60 170 C 58 130, 62 90, 60 30" strokeWidth="3" />
        <path d="M60 140 C 40 132, 28 118, 24 100" strokeWidth="2.5" />
        <path d="M60 115 C 80 108, 92 94, 96 78" strokeWidth="2.5" />
        <path d="M60 88 C 44 82, 34 70, 32 56" strokeWidth="2.5" />
        <path d="M60 62 C 76 56, 86 46, 88 32" strokeWidth="2.5" />
      </g>
      <g fill="var(--sage)" opacity="0.5">
        <ellipse cx="30" cy="112" rx="12" ry="7" transform="rotate(-32 30 112)" />
        <ellipse cx="90" cy="88" rx="12" ry="7" transform="rotate(28 90 88)" />
        <ellipse cx="38" cy="66" rx="10" ry="6" transform="rotate(-28 38 66)" />
        <ellipse cx="82" cy="44" rx="10" ry="6" transform="rotate(26 82 44)" />
        <ellipse cx="60" cy="22" rx="9" ry="6" />
      </g>
      <g fill="var(--rose)" opacity="0.55">
        <circle cx="60" cy="14" r="5" />
        <circle cx="70" cy="26" r="3.5" />
        <circle cx="50" cy="28" r="3" />
      </g>
    </svg>
  );
}

/** Tiny crescent moon accent — drawn as part of a wash cluster. */
export function MoonCrescent({ className = '' }: DecorProps) {
  return (
    <svg
      className={`decor ${className}`}
      viewBox="0 0 60 60"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M42 36.5A17 17 0 1 1 23.5 18 13.5 13.5 0 1 0 42 36.5z"
        fill="var(--powder)"
        opacity="0.8"
      />
    </svg>
  );
}

/** Soft cloud wisp. */
export function CloudWisp({ className = '' }: DecorProps) {
  return (
    <svg
      className={`decor ${className}`}
      viewBox="0 0 240 120"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="dd-blur-cloud" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <g filter="url(#dd-blur-cloud)" opacity="0.6">
        <ellipse cx="70" cy="70" rx="52" ry="30" fill="var(--paper-2)" />
        <ellipse cx="120" cy="58" rx="60" ry="36" fill="var(--powder)" opacity="0.7" />
        <ellipse cx="172" cy="70" rx="46" ry="28" fill="var(--blush)" opacity="0.7" />
      </g>
    </svg>
  );
}

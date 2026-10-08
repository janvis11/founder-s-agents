/**
 * The Aloft mark: the office block in miniature. Ink walls, a lit
 * amber roof (amber is the founder's colour in the office), one lit window.
 */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden className="logo-mark">
      <polygon points="17,2 31,10 17,18 3,10" fill="#e8930c" />
      <polygon points="3,10 17,18 17,32 3,24" fill="#0d1030" />
      <polygon points="31,10 17,18 17,32 31,24" fill="#2c3150" />
      <polygon points="7,16 11,18.3 11,22.3 7,20" fill="#fde68a" />
      <polygon points="22,20.3 26,18 26,22 22,24.3" fill="#50567a" />
      <polyline points="3,10 17,18 31,10" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.8" />
    </svg>
  );
}

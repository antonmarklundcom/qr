/**
 * Brand glyph — a stylised QR finder pattern. Deliberately not a scannable code and
 * never used to stand in for one; the editor always renders a real code.
 */
export function QrMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-hidden="true"
      fill="none"
    >
      {[
        [2, 2],
        [30, 2],
        [2, 30],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect
            x={x}
            y={y}
            width="16"
            height="16"
            rx="5"
            stroke="currentColor"
            strokeWidth="3"
          />
          <rect x={x + 5} y={y + 5} width="6" height="6" rx="3" fill="currentColor" />
        </g>
      ))}
      {[
        [24, 24],
        [32, 24],
        [40, 24],
        [24, 32],
        [40, 32],
        [24, 40],
        [32, 40],
        [40, 40],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="5" height="5" rx="1.6" fill="currentColor" />
      ))}
    </svg>
  );
}

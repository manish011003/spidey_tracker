type Props = {
  mode?: 'idle' | 'nearby' | 'updating'
  className?: string
}

export function RadarWidget({ mode = 'idle', className = '' }: Props) {
  const duration = mode === 'nearby' ? '2s' : mode === 'updating' ? '1.2s' : '4.5s'

  return (
    <div
      className={`relative pointer-events-none select-none ${className}`}
      aria-hidden
      style={{ width: 108, height: 108 }}
    >
      <svg viewBox="0 0 108 108" width="108" height="108" style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="2" width="104" height="104" fill="rgba(4,12,24,0.62)" stroke="#020810" strokeWidth="3" />
        <circle cx="54" cy="54" r="46" fill="none" stroke="#5ce1e6" strokeWidth="2" />
        <circle cx="54" cy="54" r="34" fill="none" stroke="#3a8fd4" strokeWidth="1" opacity="0.7" />
        <circle cx="54" cy="54" r="22" fill="none" stroke="#3a8fd4" strokeWidth="1" opacity="0.55" />
        <circle cx="54" cy="54" r="10" fill="none" stroke="#6bb8ef" strokeWidth="1" opacity="0.45" />

        {/* Web spokes */}
        {[0, 30, 60, 90, 120, 150].map((deg) => (
          <line
            key={deg}
            x1="54"
            y1="54"
            x2={54 + 46 * Math.cos((deg * Math.PI) / 180)}
            y2={54 + 46 * Math.sin((deg * Math.PI) / 180)}
            stroke="#5ce1e6"
            strokeWidth="1"
            opacity="0.4"
          />
        ))}

        {/* Hex web ring */}
        <polygon
          points="54,14 80,28 80,56 54,70 28,56 28,28"
          fill="none"
          stroke="#6ed4de"
          strokeWidth="1"
          opacity="0.35"
          transform="translate(0 12)"
        />

        <g style={{ transformOrigin: '54px 54px', animation: `radar-sweep ${duration} linear infinite` }}>
          <path d="M54 54 L54 8 A46 46 0 0 1 90 28 Z" fill="rgba(92,225,230,0.2)" />
        </g>

        <circle cx="54" cy="54" r="3" fill="#6fc041" stroke="#020810" strokeWidth="1" />
        {mode !== 'idle' && <circle cx="72" cy="36" r="2.5" fill="#f08833" stroke="#020810" strokeWidth="1" />}
        {mode === 'nearby' && <circle cx="38" cy="68" r="2.5" fill="#e53935" stroke="#020810" strokeWidth="1" />}
        {mode === 'updating' && <circle cx="66" cy="70" r="2" fill="#ffe066" />}
      </svg>
    </div>
  )
}

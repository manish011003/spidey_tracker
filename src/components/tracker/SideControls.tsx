import { MiniSpiderIcon } from '../../assets/spiders/SpiderAvatar'

type ControlId = 'me' | 'partner' | 'events' | 'info'

type Props = {
  active: ControlId | null
  onSelect: (id: ControlId) => void
  partnerOnline?: boolean
}

const CONTROLS: Array<{
  id: ControlId
  tip: string
  bg: string
  accent: string
}> = [
  { id: 'me', tip: 'MY LOCATION', bg: 'var(--spidey-green)', accent: '#0a1a08' },
  { id: 'partner', tip: 'CYCLE SPIDERS', bg: 'var(--spidey-red)', accent: '#1a0505' },
  { id: 'events', tip: 'EVENTS', bg: 'var(--spidey-yellow)', accent: '#1a1400' },
  { id: 'info', tip: 'WEB GUIDE', bg: 'var(--spidey-cyan)', accent: '#041218' },
]

function EventsGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden style={{ imageRendering: 'pixelated' }}>
      <rect x="7" y="1" width="2" height="14" fill="#111" />
      <rect x="1" y="7" width="14" height="2" fill="#111" />
      <rect x="3" y="3" width="2" height="2" fill="#111" />
      <rect x="11" y="3" width="2" height="2" fill="#111" />
      <rect x="3" y="11" width="2" height="2" fill="#111" />
      <rect x="11" y="11" width="2" height="2" fill="#111" />
    </svg>
  )
}

function InfoGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 14 14" aria-hidden style={{ imageRendering: 'pixelated' }}>
      <rect x="5" y="1" width="4" height="3" fill="#111" />
      <rect x="5" y="5" width="4" height="8" fill="#111" />
      <rect x="6" y="2" width="2" height="1" fill="#5ce1e6" />
      <rect x="6" y="6" width="2" height="5" fill="#5ce1e6" />
    </svg>
  )
}

export function SideControls({ active, onSelect, partnerOnline }: Props) {
  return (
    <div className="side-controls" role="toolbar" aria-label="Tracker controls">
      {CONTROLS.map((c) => {
        const isActive = active === c.id
        return (
          <button
            key={c.id}
            type="button"
            aria-label={c.tip}
            aria-pressed={isActive}
            onClick={() => onSelect(c.id)}
            className={`side-control ${isActive ? 'side-control--active' : ''}`}
            style={{
              background: `linear-gradient(160deg, ${c.bg} 0%, color-mix(in srgb, ${c.bg} 72%, ${c.accent}) 100%)`,
            }}
          >
            <span className="side-control__face">
              {c.id === 'me' && <MiniSpiderIcon suitId="classic" size={26} />}
              {c.id === 'partner' && <MiniSpiderIcon suitId="black" size={26} />}
              {c.id === 'events' && <EventsGlyph />}
              {c.id === 'info' && <InfoGlyph />}
            </span>
            {c.id === 'partner' && partnerOnline && (
              <span className="side-control__pulse" aria-hidden />
            )}
            <span className="side-control__tip" role="tooltip">
              {c.tip}
              {c.id === 'partner' && partnerOnline ? ' · SIGNALS LIVE' : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export type { ControlId }

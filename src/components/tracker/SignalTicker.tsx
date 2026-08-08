import { playSound, unlockAudio } from '../../services/sound/audio'

type Props = {
  messages: string[]
  soundEnabled: boolean
  onToggleSound: () => void
}

/** Pixel speaker icon (no lucide — keeps HUD cohesive). */
function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }} aria-hidden>
      <rect x="2" y="5" width="3" height="6" fill="#020810" />
      <rect x="5" y="4" width="2" height="8" fill="#020810" />
      <rect x="7" y="2" width="2" height="12" fill="#020810" />
      {!muted && (
        <>
          <rect x="11" y="5" width="1" height="6" fill="#020810" />
          <rect x="13" y="3" width="1" height="10" fill="#020810" />
        </>
      )}
      {muted && (
        <>
          <rect x="10" y="5" width="5" height="1" fill="#020810" transform="rotate(45 12 8)" />
          <rect x="10" y="10" width="5" height="1" fill="#020810" transform="rotate(-45 12 8)" />
        </>
      )}
    </svg>
  )
}

export function SignalTicker({ messages, soundEnabled, onToggleSound }: Props) {
  const text = messages.length
    ? messages.join('   //   ')
    : 'SPIDER SIGNAL: STABLE   //   WEB NETWORK: ONLINE   //   PRIVATE LINK ACTIVE'

  return (
    <div className="flex items-stretch gap-2 w-full" style={{ minHeight: 40 }}>
      <div
        className="pixel-marquee flex-1 flex items-center px-3 border-[3px] border-black"
        style={{ background: '#0a121c', boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.55)' }}
        aria-live="off"
      >
        <div className="pixel-marquee__track">{text}</div>
      </div>
      <button
        type="button"
        className="pixel-square shrink-0"
        style={{
          width: 40,
          height: 40,
          background: 'var(--spidey-green)',
          minWidth: 40,
        }}
        aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
        aria-pressed={soundEnabled}
        onClick={() => {
          void unlockAudio()
          onToggleSound()
          playSound('click')
        }}
      >
        <SpeakerIcon muted={!soundEnabled} />
      </button>
    </div>
  )
}

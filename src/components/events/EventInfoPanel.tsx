import { PixelModal } from '../pixel/PixelModal'
import { PixelButton } from '../pixel/PixelButton'
import type { SharedEvent } from '../../types'
import { getEventIcon } from '../../data/events'
import { playSound } from '../../services/sound/audio'

type Props = {
  event: SharedEvent | null
  authorName?: string
  onClose: () => void
  onFlyTo?: (event: SharedEvent) => void
}

export function EventInfoPanel({ event, authorName, onClose, onFlyTo }: Props) {
  if (!event) return null
  const icon = getEventIcon(event.icon)

  return (
    <PixelModal open={Boolean(event)} title={`★ ${event.title.toUpperCase()}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div
          className="w-12 h-12 flex items-center justify-center border-[3px] border-black text-2xl"
          style={{ background: event.color ?? icon.color }}
        >
          {icon.emoji}
        </div>
        <p className="font-[family-name:var(--font-readable)] text-2xl" style={{ color: 'var(--spidey-cyan)' }}>
          {event.locationName}
        </p>
        <p className="pixel-label" style={{ color: 'var(--spidey-yellow)' }}>
          {event.date}
        </p>
        {event.description && (
          <p className="font-[family-name:var(--font-readable)] text-xl" style={{ color: 'var(--spidey-text)' }}>
            "{event.description}"
          </p>
        )}
        <p className="pixel-label" style={{ color: 'var(--spidey-text-dim)', fontSize: 7 }}>
          ADDED BY {authorName ?? 'SPIDER'}
        </p>
        {onFlyTo && (
          <PixelButton
            className="w-full"
            onClick={() => {
              playSound('signal')
              onFlyTo(event)
              onClose()
            }}
          >
            SHOW ON MAP
          </PixelButton>
        )}
      </div>
    </PixelModal>
  )
}

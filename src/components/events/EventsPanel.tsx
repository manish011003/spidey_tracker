import { PixelModal } from '../pixel/PixelModal'
import { PixelButton } from '../pixel/PixelButton'
import type { SharedEvent } from '../../types'
import { getEventIcon } from '../../data/events'
import { playSound } from '../../services/sound/audio'

type Props = {
  open: boolean
  events: SharedEvent[]
  myUid: string
  partnerName?: string
  myName: string
  hasRelationship: boolean
  onClose: () => void
  onCreate: () => void
  onSelect: (event: SharedEvent) => void
  onFlyTo: (event: SharedEvent) => void
}

export function EventsPanel({
  open,
  events,
  myUid,
  partnerName,
  myName,
  hasRelationship,
  onClose,
  onCreate,
  onSelect,
  onFlyTo,
}: Props) {
  const sorted = [...events].sort((a, b) => {
    const da = a.date || ''
    const db = b.date || ''
    if (da !== db) return db.localeCompare(da)
    return b.createdAt - a.createdAt
  })

  return (
    <PixelModal open={open} title="SHARED EVENTS" onClose={onClose} wide>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="pixel-label" style={{ color: 'var(--spidey-cyan)', fontSize: 7 }}>
            {sorted.length} EVENT{sorted.length === 1 ? '' : 'S'} ON YOUR WEB
          </p>
          <PixelButton
            variant="orange"
            className="!text-[7px] !py-2 !px-3"
            disabled={!hasRelationship}
            onClick={() => {
              playSound('click')
              onCreate()
            }}
          >
            + NEW
          </PixelButton>
        </div>

        {!hasRelationship && (
          <p className="pixel-label" style={{ color: 'var(--spidey-yellow)', fontSize: 7 }}>
            LINK A PARTNER TO CREATE & VIEW SHARED EVENTS
          </p>
        )}

        {hasRelationship && sorted.length === 0 && (
          <div className="pixel-inset p-4 text-center">
            <p className="pixel-label" style={{ color: 'var(--spidey-text-dim)', fontSize: 8 }}>
              NO EVENTS YET
            </p>
            <p
              className="font-[family-name:var(--font-readable)] text-lg mt-2"
              style={{ color: 'var(--spidey-text-dim)' }}
            >
              Drop memories on the map — dates, cafes, trips.
            </p>
            <PixelButton className="mt-3 w-full" onClick={onCreate}>
              CREATE FIRST EVENT
            </PixelButton>
          </div>
        )}

        <ul className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto m-0 p-0 list-none">
          {sorted.map((ev) => {
            const icon = getEventIcon(ev.icon)
            const author = ev.createdBy === myUid ? myName : (partnerName ?? 'PARTNER')
            return (
              <li key={ev.id}>
                <button
                  type="button"
                  className="w-full pixel-inset p-2 flex gap-2 items-stretch text-left"
                  onClick={() => {
                    playSound('click')
                    onSelect(ev)
                  }}
                >
                  <span
                    className="w-10 h-10 shrink-0 flex items-center justify-center border-[3px] border-black text-lg"
                    style={{ background: ev.color ?? icon.color }}
                    aria-hidden
                  >
                    {icon.emoji}
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col gap-1">
                    <span className="pixel-label truncate" style={{ color: 'var(--spidey-white)', fontSize: 8 }}>
                      {ev.title}
                    </span>
                    <span className="pixel-label truncate" style={{ color: 'var(--spidey-cyan)', fontSize: 6 }}>
                      {ev.locationName || 'UNKNOWN LOC'}
                    </span>
                    <span className="pixel-label" style={{ color: 'var(--spidey-text-dim)', fontSize: 6 }}>
                      {ev.date || 'NO DATE'} · {author}
                    </span>
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="pixel-btn self-center !text-[6px] !py-1 !px-2 shrink-0"
                    style={{ background: 'var(--spidey-panel)', color: 'var(--spidey-yellow)' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      playSound('signal')
                      onFlyTo(ev)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        onFlyTo(ev)
                      }
                    }}
                  >
                    MAP
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </PixelModal>
  )
}

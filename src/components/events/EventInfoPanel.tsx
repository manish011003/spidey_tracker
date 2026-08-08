import { useState } from 'react'
import { PixelModal } from '../pixel/PixelModal'
import { PixelButton } from '../pixel/PixelButton'
import type { SharedEvent } from '../../types'
import { getEventIcon } from '../../data/events'
import { playSound } from '../../services/sound/audio'

type Props = {
  event: SharedEvent | null
  authorName?: string
  isOwner?: boolean
  onClose: () => void
  onFlyTo?: (event: SharedEvent) => void
  onDelete?: (event: SharedEvent) => Promise<void>
}

export function EventInfoPanel({
  event,
  authorName,
  isOwner,
  onClose,
  onFlyTo,
  onDelete,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!event) return null
  const icon = getEventIcon(event.icon)
  const visibilityLabel =
    event.visibility === 'everyone'
      ? 'VISIBLE TO EVERYONE'
      : event.storage === 'relationship'
        ? 'PARTNER WEB (LEGACY)'
        : 'CHOSEN FRIENDS'

  const handleDelete = async () => {
    if (!onDelete) return
    setBusy(true)
    setError(null)
    try {
      await onDelete(event)
      playSound('signal')
      setConfirmDelete(false)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'DELETE FAILED')
      playSound('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PixelModal open={Boolean(event)} title={`★ ${event.title.toUpperCase()}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {error && (
          <p className="font-[family-name:var(--font-readable)] text-xl" style={{ color: 'var(--spidey-red)' }}>
            {error}
          </p>
        )}
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
        <p className="pixel-label" style={{ color: 'var(--spidey-orange)', fontSize: 6 }}>
          {visibilityLabel}
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
        {isOwner && onDelete && !confirmDelete && (
          <PixelButton
            variant="red"
            className="w-full"
            onClick={() => {
              playSound('click')
              setConfirmDelete(true)
            }}
          >
            DELETE EVENT
          </PixelButton>
        )}
        {isOwner && onDelete && confirmDelete && (
          <div className="flex flex-col gap-2">
            <p className="pixel-label" style={{ color: 'var(--spidey-yellow)', fontSize: 7 }}>
              DELETE THIS EVENT FOREVER?
            </p>
            <div className="flex gap-2">
              <PixelButton variant="red" className="flex-1" disabled={busy} onClick={() => void handleDelete()}>
                {busy ? 'DELETING…' : 'YES, DELETE'}
              </PixelButton>
              <PixelButton className="flex-1" disabled={busy} onClick={() => setConfirmDelete(false)}>
                CANCEL
              </PixelButton>
            </div>
          </div>
        )}
      </div>
    </PixelModal>
  )
}

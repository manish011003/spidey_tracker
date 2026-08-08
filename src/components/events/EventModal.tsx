import { useEffect, useState } from 'react'
import { PixelModal } from '../pixel/PixelModal'
import { PixelButton } from '../pixel/PixelButton'
import { EVENT_ICONS } from '../../data/events'
import type { EventIcon, EventVisibility, UserProfile } from '../../types'
import { searchLocations } from '../../services/geocoding/nominatim'
import type { GeocodeResult } from '../../types'

export type EventSavePayload = {
  title: string
  description: string
  latitude: number
  longitude: number
  locationName: string
  date: string
  icon: EventIcon
  color?: string
  visibility: EventVisibility
  friendIds?: string[]
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: (data: EventSavePayload) => Promise<void>
  defaultLat?: number
  defaultLng?: number
  friends?: UserProfile[]
}

export function EventModal({
  open,
  onClose,
  onSave,
  defaultLat,
  defaultLng,
  friends = [],
}: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [icon, setIcon] = useState<EventIcon>('heart')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [selected, setSelected] = useState<GeocodeResult | null>(null)
  const [visibility, setVisibility] = useState<EventVisibility>('everyone')
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setDescription('')
    setDate('')
    setIcon('heart')
    setQuery('')
    setResults([])
    setSelected(null)
    setVisibility('everyone')
    setSelectedFriends([])
    setError(null)
  }, [open])

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([])
      return
    }
    const id = window.setTimeout(() => {
      void searchLocations(query)
        .then(setResults)
        .catch(() => setError('GEOCODER UNAVAILABLE'))
    }, 400)
    return () => window.clearTimeout(id)
  }, [query])

  const toggleFriend = (uid: string) => {
    setSelectedFriends((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    )
  }

  const submit = async () => {
    if (!title.trim()) {
      setError('EVENT NAME REQUIRED')
      return
    }
    const lat = selected?.latitude ?? defaultLat
    const lng = selected?.longitude ?? defaultLng
    if (lat == null || lng == null) {
      setError('SELECT A LOCATION')
      return
    }
    if (visibility === 'friends' && selectedFriends.length === 0) {
      setError(friends.length === 0 ? 'ADD FRIENDS FIRST — USE YOUR SPIDER CODE' : 'PICK AT LEAST ONE FRIEND')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        latitude: lat,
        longitude: lng,
        locationName: selected?.displayName ?? 'Custom pin',
        date: date || new Date().toISOString().slice(0, 10),
        icon,
        color: EVENT_ICONS.find((e) => e.id === icon)?.color,
        visibility,
        friendIds: visibility === 'friends' ? selectedFriends : undefined,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'SAVE FAILED')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PixelModal open={open} title="+ ADD SPIDER EVENT" onClose={onClose} wide>
      <div className="flex flex-col gap-3">
        {error && (
          <p className="font-[family-name:var(--font-readable)] text-xl" style={{ color: 'var(--spidey-red)' }}>
            {error}
          </p>
        )}
        <label className="flex flex-col gap-1">
          <span className="pixel-label">EVENT NAME</span>
          <input className="pixel-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="pixel-label">DESCRIPTION</span>
          <textarea
            className="pixel-input min-h-[70px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="pixel-label">DATE</span>
          <input className="pixel-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <div>
          <span className="pixel-label">WHO CAN SEE THIS</span>
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              className="pixel-btn !text-[7px] !py-2 !px-3"
              style={{
                background: visibility === 'everyone' ? 'var(--spidey-orange)' : 'var(--spidey-panel)',
                color: visibility === 'everyone' ? '#111' : 'var(--spidey-text)',
              }}
              aria-pressed={visibility === 'everyone'}
              onClick={() => setVisibility('everyone')}
            >
              EVERYONE
            </button>
            <button
              type="button"
              className="pixel-btn !text-[7px] !py-2 !px-3"
              style={{
                background: visibility === 'friends' ? 'var(--spidey-cyan)' : 'var(--spidey-panel)',
                color: visibility === 'friends' ? '#111' : 'var(--spidey-text)',
              }}
              aria-pressed={visibility === 'friends'}
              onClick={() => setVisibility('friends')}
            >
              CHOSEN FRIENDS
            </button>
          </div>
          <p className="pixel-label mt-2" style={{ color: 'var(--spidey-text-dim)', fontSize: 6 }}>
            {visibility === 'everyone'
              ? 'ALL SPIDERS ON THE PLATFORM CAN SEE THIS PIN'
              : 'ONLY YOU + THE FRIENDS YOU PICK'}
          </p>
        </div>

        {visibility === 'friends' && (
          <div>
            <span className="pixel-label">PICK FRIENDS</span>
            {friends.length === 0 ? (
              <p className="pixel-label mt-2" style={{ color: 'var(--spidey-yellow)', fontSize: 7 }}>
                NO FRIENDS YET — SHARE YOUR SPIDER CODE TO ADD SOME
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1 max-h-36 overflow-y-auto m-0 p-0 list-none">
                {friends.map((f) => {
                  const on = selectedFriends.includes(f.uid)
                  return (
                    <li key={f.uid}>
                      <button
                        type="button"
                        className="w-full text-left pixel-inset px-2 py-2 flex items-center justify-between gap-2"
                        aria-pressed={on}
                        onClick={() => toggleFriend(f.uid)}
                      >
                        <span className="pixel-label truncate" style={{ color: 'var(--spidey-white)', fontSize: 7 }}>
                          {f.displayName}
                        </span>
                        <span
                          className="pixel-label shrink-0"
                          style={{ color: on ? 'var(--spidey-green)' : 'var(--spidey-text-dim)', fontSize: 6 }}
                        >
                          {on ? '✓ PICKED' : 'TAP'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        <div>
          <span className="pixel-label">ICON</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {EVENT_ICONS.map((ic) => (
              <button
                key={ic.id}
                type="button"
                onClick={() => setIcon(ic.id)}
                className="border-[3px] border-black w-10 h-10"
                style={{
                  background: ic.color,
                  outline: icon === ic.id ? '2px solid var(--spidey-cyan)' : undefined,
                }}
                aria-label={ic.label}
                aria-pressed={icon === ic.id}
              >
                {ic.emoji}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="pixel-label">SEARCH LOCATION</span>
          <input
            className="pixel-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="City, cafe, place..."
          />
        </label>
        {results.length > 0 && (
          <ul className="max-h-32 overflow-y-auto border-[3px] border-black" style={{ background: 'var(--spidey-bg-deep)' }}>
            {results.map((r) => (
              <li key={`${r.latitude}-${r.longitude}-${r.displayName}`}>
                <button
                  type="button"
                  className="w-full text-left px-2 py-1 font-[family-name:var(--font-readable)] text-lg hover:bg-[var(--spidey-blue)]"
                  style={{ color: selected === r ? 'var(--spidey-yellow)' : 'var(--spidey-text)' }}
                  onClick={() => setSelected(r)}
                >
                  {r.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}
        {selected && (
          <p className="pixel-label" style={{ color: 'var(--spidey-green)', fontSize: 7 }}>
            SELECTED: {selected.city ?? selected.displayName}
          </p>
        )}
        <PixelButton disabled={busy} onClick={() => void submit()}>
          {busy ? 'SAVING...' : 'SAVE EVENT'}
        </PixelButton>
      </div>
    </PixelModal>
  )
}

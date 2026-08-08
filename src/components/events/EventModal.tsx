import { useEffect, useState } from 'react'
import { PixelModal } from '../pixel/PixelModal'
import { PixelButton } from '../pixel/PixelButton'
import { EVENT_ICONS } from '../../data/events'
import type { EventIcon } from '../../types'
import { searchLocations } from '../../services/geocoding/nominatim'
import type { GeocodeResult } from '../../types'

type Props = {
  open: boolean
  onClose: () => void
  onSave: (data: {
    title: string
    description: string
    latitude: number
    longitude: number
    locationName: string
    date: string
    icon: EventIcon
    color?: string
  }) => Promise<void>
  defaultLat?: number
  defaultLng?: number
}

export function EventModal({ open, onClose, onSave, defaultLat, defaultLng }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [icon, setIcon] = useState<EventIcon>('heart')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [selected, setSelected] = useState<GeocodeResult | null>(null)
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

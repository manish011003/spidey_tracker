import { useMemo, useState } from 'react'
import { PixelModal } from '../pixel/PixelModal'
import { PixelButton } from '../pixel/PixelButton'
import type { DiscoveryDef } from '../../data/adventure'
import type { UserProfile } from '../../types'
import { normalizeAdventure, recordDiscovery } from '../../services/firebase/adventure'
import { sortDiscoveriesByDistance } from '../../services/discoveries/nearbyDiscoveries'
import { playSound } from '../../services/sound/audio'
import { formatDistance, haversineDistanceKm } from '../../utils/geo'

type Props = {
  open: boolean
  profile: UserProfile
  discoveries: DiscoveryDef[]
  loading?: boolean
  source?: 'osm' | 'local' | 'none'
  myLat: number | null
  myLng: number | null
  onClose: () => void
  onChanged: () => void
  onFlyTo: (lat: number, lng: number) => void
}

export function DiscoveriesPanel({
  open,
  profile,
  discoveries,
  loading,
  source = 'none',
  myLat,
  myLng,
  onClose,
  onChanged,
  onFlyTo,
}: Props) {
  const adv = useMemo(() => normalizeAdventure(profile.adventure), [profile.adventure])
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const ranked = useMemo(() => {
    if (myLat == null || myLng == null) return discoveries.map((d) => ({ ...d, distanceM: 0 }))
    return sortDiscoveriesByDistance(discoveries, myLat, myLng)
  }, [discoveries, myLat, myLng])

  const tryClaim = async (d: DiscoveryDef) => {
    if (myLat == null || myLng == null) {
      setMsg('SHARE LOCATION & REACH THE ZONE')
      return
    }
    const exactM = Math.round(haversineDistanceKm(myLat, myLng, d.latitude, d.longitude) * 1000)
    if (exactM > d.radiusM) {
      setMsg(`TOO FAR — ${exactM}m (need ≤${d.radiusM}m)`)
      playSound('error')
      return
    }
    setBusy(d.id)
    try {
      const result = await recordDiscovery(profile.uid, d.id, d.xp, d.unlockSuit, d.category)
      playSound('pair')
      setMsg(result.xpGained ? `DISCOVERED +${result.xpGained} XP` : 'ALREADY FOUND')
      onChanged()
    } catch {
      playSound('error')
      setMsg('CLAIM FAILED')
    } finally {
      setBusy(null)
    }
  }

  return (
    <PixelModal open={open} title="NEARBY QUESTS" onClose={onClose} wide>
      <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
        <p className="pixel-label" style={{ fontSize: 6, color: 'var(--spidey-text-dim)' }}>
          LANDMARKS NEAR YOU — UPDATES AS YOU MOVE. SHARE LOCATION TO CLAIM.
        </p>
        {myLat == null || myLng == null ? (
          <div className="pixel-inset p-3 text-center">
            <p className="pixel-label" style={{ color: 'var(--spidey-yellow)', fontSize: 8 }}>
              NO LOCATION SIGNAL
            </p>
            <p
              className="font-[family-name:var(--font-readable)] text-base mt-2"
              style={{ color: 'var(--spidey-text-dim)' }}
            >
              Turn on location sharing to spawn nearby park / cafe / temple / mall quests.
            </p>
          </div>
        ) : (
          <p className="pixel-label" style={{ fontSize: 6, color: 'var(--spidey-cyan)' }}>
            {loading ? 'SCANNING SECTOR…' : `${ranked.length} SIGNALS`}
            {source === 'osm' ? ' · LIVE MAP DATA' : source === 'local' ? ' · SECTOR NODES' : ''}
          </p>
        )}

        {ranked.map((d) => {
          const found = adv.discoveries.includes(d.id)
          return (
            <div key={d.id} className="pixel-inset p-2 flex flex-col gap-1">
              <div className="flex justify-between gap-2">
                <p
                  className="pixel-label"
                  style={{ fontSize: 7, color: found ? 'var(--spidey-green)' : 'var(--spidey-yellow)' }}
                >
                  {found ? '✓ ' : '? '}
                  {found ? d.name : d.category.toUpperCase() + ' SIGNAL'}
                </p>
                <p className="pixel-label shrink-0" style={{ fontSize: 6, color: 'var(--spidey-cyan)' }}>
                  {myLat != null ? formatDistance(d.distanceM / 1000) : '—'} · +{d.xp}XP
                </p>
              </div>
              <p
                className="font-[family-name:var(--font-readable)] text-sm"
                style={{ color: 'var(--spidey-text)' }}
              >
                {d.clue}
              </p>
              <div className="flex gap-2 mt-1">
                <PixelButton
                  className="flex-1 !text-[6px]"
                  variant="ghost"
                  onClick={() => {
                    playSound('click')
                    onFlyTo(d.latitude, d.longitude)
                    onClose()
                  }}
                >
                  SHOW ON MAP
                </PixelButton>
                <PixelButton
                  className="flex-1 !text-[6px]"
                  disabled={found || busy === d.id || myLat == null}
                  onClick={() => void tryClaim(d)}
                >
                  {found ? 'FOUND' : busy === d.id ? '...' : 'CLAIM HERE'}
                </PixelButton>
              </div>
            </div>
          )
        })}
        {msg && (
          <p className="pixel-label text-center" style={{ color: 'var(--spidey-orange)', fontSize: 7 }}>
            {msg}
          </p>
        )}
      </div>
    </PixelModal>
  )
}

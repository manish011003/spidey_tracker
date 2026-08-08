import { useMemo, useState } from 'react'
import { PixelModal } from '../pixel/PixelModal'
import { PixelButton } from '../pixel/PixelButton'
import { DISCOVERIES } from '../../data/adventure'
import type { UserProfile } from '../../types'
import { normalizeAdventure, recordDiscovery } from '../../services/firebase/adventure'
import { haversineDistanceKm } from '../../utils/geo'
import { playSound } from '../../services/sound/audio'

type Props = {
  open: boolean
  profile: UserProfile
  myLat: number | null
  myLng: number | null
  onClose: () => void
  onChanged: () => void
  onFlyTo: (lat: number, lng: number) => void
}

export function DiscoveriesPanel({
  open,
  profile,
  myLat,
  myLng,
  onClose,
  onChanged,
  onFlyTo,
}: Props) {
  const adv = useMemo(() => normalizeAdventure(profile.adventure), [profile.adventure])
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const tryClaim = async (id: string) => {
    const d = DISCOVERIES.find((x) => x.id === id)
    if (!d || myLat == null || myLng == null) {
      setMsg('SHARE LOCATION & REACH THE ZONE')
      return
    }
    const distM = haversineDistanceKm(myLat, myLng, d.latitude, d.longitude) * 1000
    if (distM > d.radiusM) {
      setMsg(`TOO FAR — ${Math.round(distM)}m (need ≤${d.radiusM}m)`)
      playSound('error')
      return
    }
    setBusy(id)
    try {
      const result = await recordDiscovery(profile.uid, d.id, d.xp, d.unlockSuit)
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
    <PixelModal open={open} title="HIDDEN WEBS" onClose={onClose} wide>
      <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
        <p className="pixel-label" style={{ fontSize: 6, color: 'var(--spidey-text-dim)' }}>
          FOLLOW CLUES TO PUBLIC PLACES. OPT-IN LOCATION REQUIRED TO CLAIM.
        </p>
        {DISCOVERIES.map((d) => {
          const found = adv.discoveries.includes(d.id)
          return (
            <div key={d.id} className="pixel-inset p-2 flex flex-col gap-1">
              <div className="flex justify-between">
                <p className="pixel-label" style={{ fontSize: 7, color: found ? 'var(--spidey-green)' : 'var(--spidey-yellow)' }}>
                  {found ? '✓ ' : '? '}
                  {found ? d.name : d.category.toUpperCase() + ' SIGNAL'}
                </p>
                <p className="pixel-label" style={{ fontSize: 6, color: 'var(--spidey-cyan)' }}>
                  +{d.xp}XP
                </p>
              </div>
              <p className="font-[family-name:var(--font-readable)] text-sm" style={{ color: 'var(--spidey-text)' }}>
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
                  disabled={found || busy === d.id}
                  onClick={() => void tryClaim(d.id)}
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

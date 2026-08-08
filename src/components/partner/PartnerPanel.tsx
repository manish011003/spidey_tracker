import { useEffect, useState } from 'react'
import { PixelModal } from '../pixel/PixelModal'
import { PixelButton } from '../pixel/PixelButton'
import { SpiderAvatar } from '../../assets/spiders/SpiderAvatar'
import type { PresenceData, UserProfile } from '../../types'
import { formatRelativeTime, getPresenceStatus } from '../../utils/geo'
import { reverseGeocode } from '../../services/geocoding/nominatim'
import { getSuit } from '../../data/suits'

type Props = {
  open: boolean
  partner: UserProfile | null
  presence: PresenceData
  now?: number
  onClose: () => void
  onUnlink?: () => void
  onFind?: () => void
  onNudge?: () => void
  nudgeBusy?: boolean
  nudgeCooldown?: boolean
}

export function PartnerPanel({
  open,
  partner,
  presence,
  now = Date.now(),
  onClose,
  onUnlink,
  onFind,
  onNudge,
  nudgeBusy,
  nudgeCooldown,
}: Props) {
  const [area, setArea] = useState<string>('—')
  const status = getPresenceStatus(presence.online, presence.lastSeen, now)

  useEffect(() => {
    if (!presence.locationSharingEnabled || presence.latitude == null || presence.longitude == null) {
      setArea(presence.locationSharingEnabled ? 'CALIBRATING...' : 'LOCATION CLOAKED')
      return
    }
    let cancelled = false
    void reverseGeocode(presence.latitude, presence.longitude).then((name) => {
      if (!cancelled) setArea(name)
    })
    return () => {
      cancelled = true
    }
  }, [presence.latitude, presence.longitude, presence.locationSharingEnabled])

  if (!partner) {
    return (
      <PixelModal open={open} title="PARTNER SIGNAL" onClose={onClose}>
        <div className="text-center py-4 flex flex-col gap-3">
          <p className="pixel-label" style={{ color: 'var(--spidey-red)', fontSize: 10 }}>
            SPIDER SIGNAL LOST
          </p>
          <p className="font-[family-name:var(--font-readable)] text-xl" style={{ color: 'var(--spidey-text-dim)' }}>
            Your partner hasn't joined the network yet.
          </p>
        </div>
      </PixelModal>
    )
  }

  const suit = getSuit(partner.suitId)
  const statusLabel =
    status === 'online' ? '🟢 SPIDER ONLINE' : status === 'fading' ? '🟡 SIGNAL FADING' : '⚫ OFFLINE'

  return (
    <PixelModal open={open} title="PARTNER SIGNAL" onClose={onClose}>
      <div className="flex flex-col items-center gap-3 text-center">
        <SpiderAvatar spiderId={partner.spiderId} suitId={partner.suitId} size={80} pulse={status === 'online'} />
        <p className="pixel-label" style={{ color: 'var(--spidey-white)', fontSize: 12 }}>
          {partner.displayName}
        </p>
        <p className="pixel-label" style={{ color: 'var(--spidey-yellow)', fontSize: 8 }}>
          SUIT: {suit.name}
        </p>
        <p className="pixel-label" style={{ color: 'var(--spidey-cyan)', fontSize: 8 }}>
          {statusLabel}
        </p>
        <div className="pixel-inset p-3 w-full text-left flex flex-col gap-2">
          <p className="pixel-label" style={{ fontSize: 7 }}>
            LOCATION: {presence.locationSharingEnabled ? 'SHARING' : 'CLOAKED'}
          </p>
          <p className="pixel-label" style={{ fontSize: 7 }}>
            LAST SIGNAL: {formatRelativeTime(presence.timestamp ?? presence.lastSeen, now)}
          </p>
          <p className="pixel-label" style={{ fontSize: 7 }}>
            CURRENT AREA: {area}
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full">
          {onNudge && (
            <PixelButton
              variant="orange"
              className="w-full"
              onClick={onNudge}
              disabled={nudgeBusy || nudgeCooldown}
            >
              {nudgeCooldown ? 'NUDGE COOLDOWN...' : nudgeBusy ? 'SENDING...' : 'NUDGE PARTNER'}
            </PixelButton>
          )}
          <div className="flex gap-2 w-full">
            {onFind && (
              <PixelButton className="flex-1" onClick={onFind} disabled={!presence.locationSharingEnabled}>
                FIND SPIDER
              </PixelButton>
            )}
            {onUnlink && (
              <PixelButton variant="red" className="flex-1" onClick={onUnlink}>
                UNLINK
              </PixelButton>
            )}
          </div>
        </div>
      </div>
    </PixelModal>
  )
}

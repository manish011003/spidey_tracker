import { useMemo } from 'react'
import { DivIcon } from 'leaflet'
import { Marker, Popup } from 'react-leaflet'
import type { SuitId, SpiderId } from '../../types'
import { getSuit } from '../../data/suits'
import { formatSignalLabel } from '../../utils/geo'
import { getSuitLogoUrl } from '../../assets/spiders/SpiderAvatar'

type Props = {
  position: [number, number]
  name: string
  spiderId: SpiderId
  suitId: SuitId
  pulsing?: boolean
  weak?: boolean
  /** Location update timestamp (ms). */
  signalAt?: number | null
  /** Presence lastSeen (ms). */
  lastSeen?: number | null
  now?: number
  /** Override pin caption (e.g. FRIEND). */
  labelOverride?: string
  onClick?: () => void
}

export function createPartnerIcon(
  suitId: SuitId,
  pulsing: boolean,
  weak: boolean,
  signalLabel: string,
): DivIcon {
  const suit = getSuit(suitId)
  const logo = getSuitLogoUrl(suitId)
  const labelColor = weak ? '#ffc94a' : signalLabel === 'LIVE' || signalLabel === 'FRIEND' ? '#6fc041' : '#5ce1e6'
  const ring = pulsing
    ? `<span class="map-spidey-pin__ring" style="border-color:${suit.primaryColor}"></span>`
    : ''

  return new DivIcon({
    className: 'spidey-marker',
    iconSize: [100, 68],
    iconAnchor: [50, 32],
    html: `<div class="map-spidey-pin map-spidey-pin--partner" style="filter:${weak ? 'grayscale(0.65) opacity(0.85)' : 'none'}">
      <div class="map-spidey-pin__orb-wrap">
        ${ring}
        <div class="map-spidey-pin__orb" style="background:linear-gradient(160deg,${suit.primaryColor},color-mix(in srgb, ${suit.primaryColor} 70%, #020810))">
          <img src="${logo}" alt="" width="30" height="30" style="image-rendering:pixelated;display:block;filter:drop-shadow(1px 1px 0 #020810)" />
        </div>
      </div>
      <div class="map-spidey-pin__label" style="color:${labelColor}">${signalLabel}</div>
    </div>`,
  })
}

export function PartnerMarker({
  position,
  name,
  spiderId,
  suitId,
  pulsing,
  weak,
  signalAt,
  lastSeen,
  now = Date.now(),
  labelOverride,
  onClick,
}: Props) {
  const signalLabel =
    labelOverride ??
    formatSignalLabel(signalAt ?? lastSeen, {
      weak: Boolean(weak),
      now,
    })

  const icon = useMemo(
    () => createPartnerIcon(suitId, Boolean(pulsing), Boolean(weak), signalLabel),
    [suitId, pulsing, weak, signalLabel],
  )

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={
        onClick
          ? {
              click: () => onClick(),
            }
          : undefined
      }
    >
      <Popup className="spidey-popup">
        <div className="spidey-popup__body">
          <strong>{name}</strong>
          <br />
          Spider: {spiderId} / {suitId}
          <br />
          {signalLabel}
          {weak ? (
            <>
              <br />
              Signal stale — last known broadcast
            </>
          ) : null}
        </div>
      </Popup>
    </Marker>
  )
}

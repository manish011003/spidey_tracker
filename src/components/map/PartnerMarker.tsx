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
  /** Small role chip on pin (PARTNER / FRIEND) — signal label stays LIVE-style. */
  roleTag?: 'PARTNER' | 'FRIEND'
  onClick?: () => void
}

export function createPartnerIcon(
  suitId: SuitId,
  pulsing: boolean,
  weak: boolean,
  signalLabel: string,
  roleTag?: 'PARTNER' | 'FRIEND',
): DivIcon {
  const suit = getSuit(suitId)
  const logo = getSuitLogoUrl(suitId)
  const labelColor = weak ? '#ffc94a' : signalLabel === 'LIVE' ? '#6fc041' : '#5ce1e6'
  const ring = pulsing
    ? `<span class="map-spidey-pin__ring" style="border-color:${suit.primaryColor}"></span>`
    : ''
  const tag = roleTag
    ? `<div class="map-spidey-pin__tag" style="color:${roleTag === 'FRIEND' ? '#5ce1e6' : '#ff9f1a'}">${roleTag}</div>`
    : ''

  return new DivIcon({
    className: 'spidey-marker',
    iconSize: [100, 72],
    iconAnchor: [50, 36],
    html: `<div class="map-spidey-pin map-spidey-pin--partner" style="filter:${weak ? 'grayscale(0.65) opacity(0.85)' : 'none'}">
      <div class="map-spidey-pin__orb-wrap">
        ${ring}
        <div class="map-spidey-pin__orb" style="background:linear-gradient(160deg,${suit.primaryColor},color-mix(in srgb, ${suit.primaryColor} 70%, #020810))">
          <img src="${logo}" alt="" width="30" height="30" style="image-rendering:pixelated;display:block;filter:drop-shadow(1px 1px 0 #020810)" />
        </div>
      </div>
      ${tag}
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
  roleTag,
  onClick,
}: Props) {
  const signalLabel = formatSignalLabel(signalAt ?? lastSeen, {
    weak: Boolean(weak),
    now,
  })

  const icon = useMemo(
    () => createPartnerIcon(suitId, Boolean(pulsing), Boolean(weak), signalLabel, roleTag),
    [suitId, pulsing, weak, signalLabel, roleTag],
  )

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(),
      }}
    >
      <Popup className="spidey-popup">
        <div className="spidey-popup__body">
          <strong>{name}</strong>
          {roleTag ? (
            <>
              <br />
              {roleTag}
            </>
          ) : null}
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
          {onClick ? (
            <>
              <br />
              Tap pin for nudge / find
            </>
          ) : null}
        </div>
      </Popup>
    </Marker>
  )
}

import { useEffect, useMemo, useRef } from 'react'
import { DivIcon, type Marker as LeafletMarker } from 'leaflet'
import { Marker, Popup } from 'react-leaflet'
import type { SuitId, SpiderId } from '../../types'
import { getSuitLogoUrl } from '../../assets/spiders/SpiderAvatar'

type Props = {
  position: [number, number]
  name: string
  spiderId?: SpiderId
  suitId?: SuitId
  popupOpen?: boolean
  popupKey?: number
  popupDelayMs?: number
}

export function createSelfIcon(suitId: SuitId = 'classic'): DivIcon {
  const logo = getSuitLogoUrl(suitId)
  return new DivIcon({
    className: 'spidey-marker',
    iconSize: [84, 58],
    iconAnchor: [42, 28],
    html: `<div class="map-spidey-pin map-spidey-pin--self">
      <div class="map-spidey-pin__orb" style="background:linear-gradient(160deg,#7fd84a,#4a9e28)">
        <img src="${logo}" alt="" width="28" height="28" style="image-rendering:pixelated;display:block;filter:drop-shadow(1px 1px 0 #020810)" />
      </div>
      <div class="map-spidey-pin__label" style="color:#6fc041">YOU</div>
    </div>`,
  })
}

export function SelfMarker({
  position,
  name,
  suitId = 'classic',
  popupOpen = false,
  popupKey = 0,
  popupDelayMs = 900,
}: Props) {
  const markerRef = useRef<LeafletMarker | null>(null)
  const icon = useMemo(() => createSelfIcon(suitId), [suitId])

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return
    if (popupOpen) {
      const t = window.setTimeout(() => marker.openPopup(), popupDelayMs)
      return () => window.clearTimeout(t)
    }
    marker.closePopup()
  }, [popupOpen, popupKey, popupDelayMs, position[0], position[1]])

  return (
    <Marker ref={markerRef} position={position} icon={icon}>
      <Popup className="spidey-popup" autoPan={false}>
        <div className="spidey-popup__body">
          <strong>YOU — {name}</strong>
          <br />
          Your live spider signal
        </div>
      </Popup>
    </Marker>
  )
}

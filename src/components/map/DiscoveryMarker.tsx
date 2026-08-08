import { useMemo } from 'react'
import { DivIcon } from 'leaflet'
import { Marker, Popup } from 'react-leaflet'
import type { DiscoveryDef } from '../../data/adventure'

type Props = {
  discovery: DiscoveryDef
  found: boolean
  onClick?: () => void
}

function createDiscoveryIcon(found: boolean, category: string): DivIcon {
  const color = found ? '#6fc041' : '#5ce1e6'
  return new DivIcon({
    className: 'spidey-marker',
    iconSize: [56, 56],
    iconAnchor: [28, 28],
    html: `<div class="map-discovery-pin" style="border-color:${color};color:${color}">
      <span style="font-family:'Press Start 2P',monospace;font-size:14px;line-height:1">${found ? '✓' : '?'}</span>
      <span style="font-family:'Press Start 2P',monospace;font-size:5px;margin-top:2px">${category.slice(0, 4).toUpperCase()}</span>
    </div>`,
  })
}

export function DiscoveryMarker({ discovery, found, onClick }: Props) {
  const icon = useMemo(
    () => createDiscoveryIcon(found, discovery.category),
    [found, discovery.category],
  )

  return (
    <Marker
      position={[discovery.latitude, discovery.longitude]}
      icon={icon}
      eventHandlers={onClick ? { click: () => onClick() } : undefined}
      opacity={found ? 0.55 : 0.95}
    >
      <Popup className="spidey-popup">
        <div className="spidey-popup__body">
          <strong>{found ? discovery.name : 'HIDDEN SIGNAL'}</strong>
          <br />
          {discovery.clue}
          <br />
          +{discovery.xp} XP
        </div>
      </Popup>
    </Marker>
  )
}

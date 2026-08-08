import { DivIcon } from 'leaflet'
import { Marker } from 'react-leaflet'
import type { SharedEvent } from '../../types'
import { getEventIcon } from '../../data/events'

type Props = {
  event: SharedEvent
  onClick: (event: SharedEvent) => void
}

export function createEventIcon(event: SharedEvent): DivIcon {
  const def = getEventIcon(event.icon)
  const color = event.color ?? def.color
  return new DivIcon({
    className: 'spidey-event-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="
      width:28px;height:28px;background:${color};border:3px solid #020810;
      box-shadow:2px 2px 0 #020810;display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:bold;color:#111;cursor:pointer;
    ">${def.emoji}</div>`,
  })
}

export function EventMarker({ event, onClick }: Props) {
  return (
    <Marker
      position={[event.latitude, event.longitude]}
      icon={createEventIcon(event)}
      eventHandlers={{ click: () => onClick(event) }}
    />
  )
}

import { useEffect, useMemo, useRef, memo } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { SharedEvent, UserProfile, PresenceData } from '../../types'
import { PartnerMarker } from './PartnerMarker'
import { SelfMarker } from './SelfMarker'
import { EventMarker } from './EventMarker'
import { PixelZoomControl } from './PixelZoomControl'
import { getPresenceStatus } from '../../utils/geo'
import { PixelButton } from '../pixel/PixelButton'

const TILE_URL =
  (import.meta.env.VITE_MAP_TILE_URL as string | undefined) ??
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const ATTRIBUTION =
  (import.meta.env.VITE_MAP_ATTRIBUTION as string | undefined) ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'

type FlyTarget = {
  lat: number
  lng: number
  zoom?: number
  nonce: number
} | null

type Props = {
  user: UserProfile
  partner: UserProfile | null
  friends?: UserProfile[]
  friendPresence?: Record<string, PresenceData>
  myPresence: PresenceData | null
  partnerPresence: PresenceData | null
  events: SharedEvent[]
  flyTo: FlyTarget
  onEventClick: (event: SharedEvent) => void
  onSpiderClick?: (uid: string, kind: 'partner' | 'friend') => void
  now?: number
  mySharingEnabled?: boolean
  onEnableSharing?: () => void
}

function MapController({ flyTo }: { flyTo: FlyTarget }) {
  const map = useMap()
  const lastNonce = useRef<number | null>(null)

  useEffect(() => {
    if (!flyTo || flyTo.nonce === lastNonce.current) return
    lastNonce.current = flyTo.nonce
    map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? Math.max(map.getZoom(), 12), {
      duration: 1.2,
    })
  }, [flyTo, map])

  useEffect(() => {
    const container = map.getContainer()
    container.style.background = '#071426'
  }, [map])

  return null
}

function SignalHud({
  partner,
  partnerPresence,
  friendCount,
  visibleFriends,
  mySharingEnabled,
  onEnableSharing,
  now,
}: {
  partner: UserProfile | null
  partnerPresence: PresenceData | null
  friendCount: number
  visibleFriends: number
  mySharingEnabled: boolean
  onEnableSharing?: () => void
  now: number
}) {
  if (!partner && friendCount === 0) {
    return (
      <div className="map-signal-chip" role="status">
        <p className="pixel-label" style={{ color: 'var(--spidey-yellow)', fontSize: 7 }}>
          AWAITING PARTNER / FRIEND LINK
        </p>
      </div>
    )
  }

  if (!partner && friendCount > 0) {
    return (
      <div className="map-signal-chip" role="status">
        <p className="pixel-label" style={{ color: 'var(--spidey-cyan)', fontSize: 7 }}>
          {visibleFriends > 0
            ? `${visibleFriends} FRIEND SIGNAL${visibleFriends === 1 ? '' : 'S'} ON MAP`
            : `${friendCount} FRIEND${friendCount === 1 ? '' : 'S'} · LOCATION CLOAKED`}
        </p>
      </div>
    )
  }

  if (!partnerPresence?.locationSharingEnabled) {
    return (
      <div className="map-signal-chip map-signal-chip--action" role="status">
        <p className="pixel-label" style={{ color: 'var(--spidey-red)', fontSize: 7 }}>
          LOCATION CLOAKED
        </p>
        <p
          className="font-[family-name:var(--font-readable)] text-base"
          style={{ color: 'var(--spidey-text-dim)', margin: 0 }}
        >
          Partner spider is invisible
        </p>
        {!mySharingEnabled && onEnableSharing ? (
          <PixelButton
            variant="orange"
            className="!text-[7px] !py-2 !px-2 mt-1"
            onClick={onEnableSharing}
          >
            SHARE MY LOCATION
          </PixelButton>
        ) : null}
      </div>
    )
  }

  if (partnerPresence.latitude == null || partnerPresence.longitude == null) {
    return (
      <div className="map-signal-chip" role="status">
        <p className="pixel-label blink" style={{ color: 'var(--spidey-cyan)', fontSize: 7 }}>
          CALIBRATING WEB SENSORS...
        </p>
      </div>
    )
  }

  // Partner visible — optional nudge if you aren't sharing
  if (!mySharingEnabled && onEnableSharing) {
    return (
      <div className="map-signal-chip map-signal-chip--action" role="status">
        <p className="pixel-label" style={{ color: 'var(--spidey-green)', fontSize: 7 }}>
          PARTNER SIGNAL ACTIVE
        </p>
        <PixelButton
          variant="orange"
          className="!text-[7px] !py-2 !px-2 mt-1"
          onClick={onEnableSharing}
        >
          SHARE MY LOCATION
        </PixelButton>
        <span className="sr-only">{now}</span>
      </div>
    )
  }

  return null
}

function TrackerMapInner({
  user,
  partner,
  friends = [],
  friendPresence = {},
  myPresence,
  partnerPresence,
  events,
  flyTo,
  onEventClick,
  onSpiderClick,
  now = Date.now(),
  mySharingEnabled = false,
  onEnableSharing,
}: Props) {
  const partnerPos = useMemo<[number, number] | null>(() => {
    if (!partnerPresence?.locationSharingEnabled) return null
    if (partnerPresence.latitude == null || partnerPresence.longitude == null) return null
    return [partnerPresence.latitude, partnerPresence.longitude]
  }, [partnerPresence])

  const myPos = useMemo<[number, number] | null>(() => {
    if (!myPresence?.locationSharingEnabled) return null
    if (myPresence?.latitude == null || myPresence.longitude == null) return null
    return [myPresence.latitude, myPresence.longitude]
  }, [myPresence])

  const friendMarkers = useMemo(() => {
    return friends
      .map((f) => {
        const p = friendPresence[f.uid]
        if (!p?.locationSharingEnabled) return null
        if (p.latitude == null || p.longitude == null) return null
        const status = getPresenceStatus(Boolean(p.online), p.lastSeen, now)
        const weak =
          status !== 'online' || (p.timestamp != null && now - p.timestamp > 3 * 60_000)
        const pulsing = p.speed != null && p.speed > 0.5 && !weak
        return { friend: f, presence: p, weak, pulsing }
      })
      .filter(Boolean) as Array<{
      friend: UserProfile
      presence: PresenceData
      weak: boolean
      pulsing: boolean
    }>
  }, [friends, friendPresence, now])

  const partnerStatus = getPresenceStatus(
    Boolean(partnerPresence?.online),
    partnerPresence?.lastSeen,
    now,
  )
  const partnerWeak =
    partnerStatus !== 'online' ||
    (partnerPresence?.timestamp != null && now - partnerPresence.timestamp > 3 * 60_000)
  const partnerPulsing =
    partnerPresence?.speed != null && partnerPresence.speed > 0.5 && !partnerWeak

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={18}
        className="h-full w-full"
        zoomControl={false}
        attributionControl
        style={{ background: '#071426' }}
        worldCopyJump
      >
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
        <MapController flyTo={flyTo} />
        <PixelZoomControl />

        {myPos && (
          <SelfMarker
            position={myPos}
            name={user.displayName}
            spiderId={user.spiderId}
            suitId={user.suitId}
          />
        )}

        {partner && partnerPos && (
          <PartnerMarker
            position={partnerPos}
            name={partner.displayName}
            spiderId={partner.spiderId}
            suitId={partner.suitId}
            pulsing={partnerPulsing}
            weak={partnerWeak}
            signalAt={partnerPresence?.timestamp}
            lastSeen={partnerPresence?.lastSeen}
            now={now}
            onClick={onSpiderClick ? () => onSpiderClick(partner.uid, 'partner') : undefined}
          />
        )}

        {friendMarkers.map(({ friend, presence, weak, pulsing }) => (
          <PartnerMarker
            key={friend.uid}
            position={[presence.latitude!, presence.longitude!]}
            name={friend.displayName}
            spiderId={friend.spiderId}
            suitId={friend.suitId}
            pulsing={pulsing}
            weak={weak}
            signalAt={presence.timestamp}
            lastSeen={presence.lastSeen}
            now={now}
            labelOverride="FRIEND"
            onClick={onSpiderClick ? () => onSpiderClick(friend.uid, 'friend') : undefined}
          />
        ))}

        {events.map((ev) => (
          <EventMarker key={ev.id} event={ev} onClick={onEventClick} />
        ))}
      </MapContainer>

      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] pointer-events-auto max-w-[90%]">
        <SignalHud
          partner={partner}
          partnerPresence={partnerPresence}
          friendCount={friends.length}
          visibleFriends={friendMarkers.length}
          mySharingEnabled={mySharingEnabled}
          onEnableSharing={onEnableSharing}
          now={now}
        />
      </div>
    </div>
  )
}

export const TrackerMap = memo(TrackerMapInner)

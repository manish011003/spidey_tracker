import { useEffect, useMemo, useRef, memo } from 'react'
import { latLngBounds } from 'leaflet'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { SharedEvent, UserProfile, PresenceData } from '../../types'
import { PartnerMarker } from './PartnerMarker'
import { SelfMarker } from './SelfMarker'
import { EventMarker } from './EventMarker'
import { DiscoveryMarker } from './DiscoveryMarker'
import { PixelZoomControl } from './PixelZoomControl'
import { getPresenceStatus } from '../../utils/geo'
import { PixelButton } from '../pixel/PixelButton'
import type { DiscoveryDef } from '../../data/adventure'

const TILE_URL =
  (import.meta.env.VITE_MAP_TILE_URL as string | undefined) ??
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const ATTRIBUTION =
  (import.meta.env.VITE_MAP_ATTRIBUTION as string | undefined) ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'

export type FlyTarget = {
  lat: number
  lng: number
  zoom?: number
  nonce: number
  /** Optional: zoom out to these points first, then fly to lat/lng. */
  overviewPoints?: Array<[number, number]>
  /** Open this spider pin popup after focus. */
  openPopupUid?: string | null
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
  openPopupUid?: string | null
  popupDelayMs?: number
  onEventClick: (event: SharedEvent) => void
  onSpiderClick?: (uid: string, kind: 'partner' | 'friend') => void
  discoveries?: DiscoveryDef[]
  discoveredIds?: string[]
  showDiscoveries?: boolean
  onDiscoveryClick?: () => void
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

    const focusZoom = flyTo.zoom ?? Math.max(map.getZoom(), 14)
    const focus = () => {
      map.flyTo([flyTo.lat, flyTo.lng], focusZoom, { duration: 1.1 })
    }

    const overview = flyTo.overviewPoints?.filter(
      (p) => Number.isFinite(p[0]) && Number.isFinite(p[1]),
    )
    if (overview && overview.length >= 2) {
      let focusTimer: number | undefined
      const onOverviewEnd = () => {
        focusTimer = window.setTimeout(focus, 200)
      }
      map.once('moveend', onOverviewEnd)
      const bounds = latLngBounds(overview)
      map.fitBounds(bounds.pad(0.45), { animate: true, duration: 0.9, maxZoom: 12 })
      return () => {
        map.off('moveend', onOverviewEnd)
        if (focusTimer != null) window.clearTimeout(focusTimer)
      }
    }

    focus()
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
  openPopupUid = null,
  popupDelayMs = 900,
  onEventClick,
  onSpiderClick,
  discoveries = [],
  discoveredIds = [],
  showDiscoveries = true,
  onDiscoveryClick,
  now = Date.now(),
  mySharingEnabled = false,
  onEnableSharing,
}: Props) {
  const activePopupUid = openPopupUid ?? flyTo?.openPopupUid ?? null
  const popupKey = flyTo?.nonce ?? 0
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
    // Don't double-draw if someone is also the partner
    const partnerUid = partner?.uid
    return friends
      .filter((f) => f.uid !== partnerUid)
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
  }, [friends, friendPresence, now, partner?.uid])

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
            popupOpen={activePopupUid === user.uid}
            popupKey={popupKey}
            popupDelayMs={popupDelayMs}
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
            roleTag="PARTNER"
            popupOpen={activePopupUid === partner.uid}
            popupKey={popupKey}
            popupDelayMs={popupDelayMs}
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
            roleTag="FRIEND"
            popupOpen={activePopupUid === friend.uid}
            popupKey={popupKey}
            popupDelayMs={popupDelayMs}
            onClick={onSpiderClick ? () => onSpiderClick(friend.uid, 'friend') : undefined}
          />
        ))}

        {events.map((ev) => (
          <EventMarker key={ev.id} event={ev} onClick={onEventClick} />
        ))}

        {showDiscoveries &&
          discoveries.map((d) => (
            <DiscoveryMarker
              key={d.id}
              discovery={d}
              found={discoveredIds.includes(d.id)}
              onClick={onDiscoveryClick}
            />
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

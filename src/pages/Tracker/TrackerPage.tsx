import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePartner } from '../../hooks/usePartner'
import { useMyPresence, usePartnerPresence } from '../../hooks/usePresence'
import { useLocationSharing } from '../../hooks/useLocationSharing'
import { useEvents } from '../../hooks/useEvents'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useNow } from '../../hooks/useNow'
import { TrackerShell } from '../../components/layout/TrackerShell'
import { TrackerHeader } from '../../components/tracker/TrackerHeader'
import { SideControls, type ControlId } from '../../components/tracker/SideControls'
import { SignalTicker } from '../../components/tracker/SignalTicker'
import { MapToolbar } from '../../components/tracker/MapToolbar'
import { TrackerMap } from '../../components/map/TrackerMap'
import { ProfilePanel } from '../../components/profile/ProfilePanel'
import { PartnerPanel } from '../../components/partner/PartnerPanel'
import { PartnerLinkModal } from '../../components/partner/PartnerLinkModal'
import { EventModal } from '../../components/events/EventModal'
import { EventInfoPanel } from '../../components/events/EventInfoPanel'
import { PixelLoader } from '../../components/pixel/PixelLoader'
import { PixelButton } from '../../components/pixel/PixelButton'
import type { SharedEvent } from '../../types'
import { formatDistance, formatRelativeTime, haversineDistanceKm } from '../../utils/geo'
import { setSoundEnabled, playRingtone, playSound, unlockAudio } from '../../services/sound/audio'
import { updatePreferences } from '../../services/firebase/users'
import { sendPartnerNudge, subscribeToNudges } from '../../services/firebase/nudge'
import { isFirebaseConfigured } from '../../services/firebase/config'

export function TrackerPage() {
  const { profile, loading, signOut, refreshProfile } = useAuth()
  const { partner } = usePartner(profile?.partnerId)
  const myPresence = useMyPresence(profile?.uid)
  const partnerPresence = usePartnerPresence(profile?.partnerId)
  const location = useLocationSharing(profile?.uid, profile?.preferences)
  const { events, addEvent } = useEvents(profile?.relationshipId)
  const online = useOnlineStatus()
  const now = useNow(1000)

  const [activeControl, setActiveControl] = useState<ControlId | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [partnerOpen, setPartnerOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<SharedEvent | null>(null)
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number; nonce: number } | null>(null)
  const [logoTaps, setLogoTaps] = useState(0)
  const [easterEgg, setEasterEgg] = useState(false)
  const [nudgeBusy, setNudgeBusy] = useState(false)
  const [nudgeCooldown, setNudgeCooldown] = useState(false)
  const [nudgeBanner, setNudgeBanner] = useState<string | null>(null)
  const prevPartnerId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (profile) {
      setSoundEnabled(profile.preferences.soundEnabled)
      document.documentElement.classList.toggle('reduce-motion', profile.preferences.reduceMotion)
    }
  }, [profile])

  // First-time pair ringtone for the user who gets linked (incoming link)
  useEffect(() => {
    if (!profile) return
    const prev = prevPartnerId.current
    const next = profile.partnerId
    if (prev === undefined) {
      prevPartnerId.current = next
      return
    }
    if (!prev && next) {
      void playRingtone()
      setNudgeBanner('SPIDER SIGNAL LINKED')
      window.setTimeout(() => setNudgeBanner(null), 4000)
    }
    prevPartnerId.current = next
  }, [profile?.partnerId, profile])

  // Incoming partner nudges
  useEffect(() => {
    if (!profile?.uid || !isFirebaseConfigured) return
    return subscribeToNudges(profile.uid, (nudge) => {
      void playRingtone()
      setNudgeBanner(`NUDGE FROM ${nudge.fromName.toUpperCase()}`)
      window.setTimeout(() => setNudgeBanner(null), 5000)
    })
  }, [profile?.uid])

  const sendNudge = useCallback(async () => {
    if (!profile?.partnerId || nudgeBusy || nudgeCooldown) return
    setNudgeBusy(true)
    try {
      await unlockAudio()
      await sendPartnerNudge(profile.partnerId, profile.uid, profile.displayName)
      playSound('nudge')
      setNudgeCooldown(true)
      window.setTimeout(() => setNudgeCooldown(false), 15_000)
    } catch {
      playSound('error')
    } finally {
      setNudgeBusy(false)
    }
  }, [profile, nudgeBusy, nudgeCooldown])

  const distanceKm = useMemo(() => {
    if (
      myPresence.latitude == null ||
      myPresence.longitude == null ||
      partnerPresence.latitude == null ||
      partnerPresence.longitude == null ||
      !partnerPresence.locationSharingEnabled ||
      !myPresence.locationSharingEnabled
    ) {
      return null
    }
    return haversineDistanceKm(
      myPresence.latitude,
      myPresence.longitude,
      partnerPresence.latitude,
      partnerPresence.longitude,
    )
  }, [myPresence, partnerPresence])

  const nearby = distanceKm != null && distanceKm < 0.5
  const radarMode =
    partnerPresence.timestamp && now - partnerPresence.timestamp < 15_000
      ? 'updating'
      : nearby
        ? 'nearby'
        : 'idle'

  const tickerMessages = useMemo(() => {
    const msgs: string[] = []
    msgs.push(online ? 'WEB NETWORK: ONLINE' : 'WEB CONNECTION LOST')
    if (partner && partnerPresence.online) msgs.push('TWO SPIDERS ACTIVE')
    if (partner && partnerPresence.online && myPresence.online) msgs.push('SPIDER SENSE: DOUBLE SIGNAL')
    if (nearby) msgs.push('TWO SPIDERS DETECTED IN PROXIMITY')
    if (partnerPresence.locationSharingEnabled && partnerPresence.timestamp) {
      msgs.push(`LAST LOCATION UPDATE: ${formatRelativeTime(partnerPresence.timestamp, now)}`)
    } else if (partner) {
      msgs.push(partnerPresence.locationSharingEnabled ? 'SIGNAL WEAK' : 'PARTNER LOCATION CLOAKED')
    } else {
      msgs.push('AWAITING PARTNER LINK')
    }
    msgs.push(`${events.length} SHARED EVENTS DETECTED`)
    if (distanceKm != null) msgs.push(`DISTANCE: ${formatDistance(distanceKm)}`)
    if (easterEgg) msgs.push('SECRET WEB PROTOCOL ACTIVATED')
    msgs.push('SPIDER-SENSE: ACTIVE')
    return msgs
  }, [
    online,
    partner,
    partnerPresence,
    myPresence.online,
    nearby,
    events.length,
    distanceKm,
    easterEgg,
    now,
  ])

  const centerMe = useCallback(() => {
    if (myPresence.latitude == null || myPresence.longitude == null) {
      if (location.lastLocal) {
        setFlyTo({
          lat: location.lastLocal.latitude,
          lng: location.lastLocal.longitude,
          zoom: 14,
          nonce: Date.now(),
        })
      }
      return
    }
    setFlyTo({
      lat: myPresence.latitude,
      lng: myPresence.longitude,
      zoom: 14,
      nonce: Date.now(),
    })
  }, [myPresence, location.lastLocal])

  const findSpider = useCallback(() => {
    if (partnerPresence.latitude == null || partnerPresence.longitude == null) return
    if (!partnerPresence.locationSharingEnabled) return
    playSound('signal')
    setFlyTo({
      lat: partnerPresence.latitude,
      lng: partnerPresence.longitude,
      zoom: 14,
      nonce: Date.now(),
    })
  }, [partnerPresence])

  const worldView = useCallback(() => {
    setFlyTo({ lat: 20, lng: 0, zoom: 2, nonce: Date.now() })
  }, [])

  const onControl = (id: ControlId) => {
    setActiveControl(id)
    playSound('click')
    if (id === 'me') centerMe()
    if (id === 'partner') {
      if (partner) {
        findSpider()
        setPartnerOpen(true)
      } else setLinkOpen(true)
    }
    if (id === 'events') setEventOpen(true)
    if (id === 'info') setProfileOpen(true)
  }

  const onLogoClick = () => {
    const next = logoTaps + 1
    setLogoTaps(next)
    if (next >= 5) {
      setEasterEgg(true)
      playSound('connect')
      setLogoTaps(0)
      window.setTimeout(() => setEasterEgg(false), 4000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--spidey-bg)' }}>
        <PixelLoader label="LOCATING PARTNER..." />
      </div>
    )
  }

  if (!profile) return <Navigate to="/" replace />
  if (!profile.onboardingComplete) return <Navigate to="/onboarding" replace />

  return (
    <>
      <TrackerShell
        radarMode={radarMode}
        suitId={profile.suitId}
        banner={
          nudgeBanner ? (
            <div className="pixel-panel px-3 py-2 text-center" role="status">
              <p className="pixel-label blink" style={{ color: 'var(--spidey-yellow)', fontSize: 8 }}>
                {nudgeBanner}
              </p>
            </div>
          ) : !online ? (
            <div
              className="pixel-panel px-3 py-2 text-center"
              style={{ borderColor: 'var(--spidey-red)' }}
              role="status"
            >
              <p className="pixel-label" style={{ color: 'var(--spidey-red)', fontSize: 8 }}>
                WEB CONNECTION LOST — TRYING TO RECONNECT...
              </p>
            </div>
          ) : partner && partnerPresence.online && myPresence.online ? (
            <div className="pixel-panel px-3 py-2 text-center">
              <p className="pixel-label" style={{ color: 'var(--spidey-green)', fontSize: 8 }}>
                ╔ TWO SPIDERS ACTIVE ╗
              </p>
            </div>
          ) : null
        }
        header={
          <TrackerHeader
            user={profile}
            partner={partner}
            userOnline={myPresence.online}
            partnerOnline={partnerPresence.online}
            partnerLastSeen={partnerPresence.lastSeen}
            now={now}
            onUserClick={() => setProfileOpen(true)}
            onPartnerClick={() => (partner ? setPartnerOpen(true) : setLinkOpen(true))}
            onLogoClick={onLogoClick}
          />
        }
        sideControls={
          <SideControls
            active={activeControl}
            onSelect={onControl}
            partnerOnline={partnerPresence.online}
          />
        }
        map={
          <TrackerMap
            user={profile}
            partner={partner}
            myPresence={myPresence}
            partnerPresence={partnerPresence}
            events={events}
            flyTo={flyTo}
            onEventClick={setSelectedEvent}
            now={now}
            mySharingEnabled={location.sharing}
            onEnableSharing={() => void location.setSharing(true)}
          />
        }
        toolbar={
          <MapToolbar
            onCenterMe={centerMe}
            onFindSpider={findSpider}
            onWorldView={worldView}
            onEvents={() => setEventOpen(true)}
            onLocation={() => setProfileOpen(true)}
            hasPartnerLocation={Boolean(
              partnerPresence.locationSharingEnabled &&
                partnerPresence.latitude != null &&
                partnerPresence.longitude != null,
            )}
          />
        }
        linkAction={
          !profile.partnerId ? (
            <div className="flex justify-center">
              <PixelButton className="!text-[8px] !py-2.5 !px-4 w-full max-w-xs" onClick={() => setLinkOpen(true)}>
                LINK PARTNER / FRIEND
              </PixelButton>
            </div>
          ) : null
        }
        ticker={
          <SignalTicker
            messages={tickerMessages}
            soundEnabled={profile.preferences.soundEnabled}
            onToggleSound={() => {
              const next = !profile.preferences.soundEnabled
              setSoundEnabled(next)
              void updatePreferences(profile.uid, { soundEnabled: next })
            }}
          />
        }
      />

      <ProfilePanel
        open={profileOpen}
        profile={profile}
        onClose={() => setProfileOpen(false)}
        onSignOut={() => void signOut()}
        onDeleted={() => {
          setProfileOpen(false)
        }}
        onOpenPartnerLink={() => {
          setProfileOpen(false)
          setLinkOpen(true)
        }}
        sharing={location.sharing}
        precise={location.precise}
        onToggleSharing={(v) => void location.setSharing(v)}
        onTogglePrecise={(v) => void location.setPrecise(v)}
      />

      <PartnerPanel
        open={partnerOpen}
        partner={partner}
        presence={partnerPresence}
        now={now}
        onClose={() => setPartnerOpen(false)}
        onFind={findSpider}
        onNudge={() => void sendNudge()}
        nudgeBusy={nudgeBusy}
        nudgeCooldown={nudgeCooldown}
        onUnlink={() => {
          setPartnerOpen(false)
          setLinkOpen(true)
        }}
      />

      <PartnerLinkModal
        open={linkOpen}
        profile={profile}
        partner={partner}
        onClose={() => setLinkOpen(false)}
        onChanged={() => void refreshProfile()}
      />

      <EventModal
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        defaultLat={myPresence.latitude ?? undefined}
        defaultLng={myPresence.longitude ?? undefined}
        onSave={async (data) => {
          if (!profile.relationshipId) throw new Error('LINK A PARTNER FIRST')
          await addEvent({ ...data, createdBy: profile.uid })
        }}
      />

      <EventInfoPanel
        event={selectedEvent}
        authorName={
          selectedEvent?.createdBy === profile.uid
            ? profile.displayName
            : partner?.displayName
        }
        onClose={() => setSelectedEvent(null)}
      />
    </>
  )
}

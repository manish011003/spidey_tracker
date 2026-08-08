import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePartner } from '../../hooks/usePartner'
import { useFriends } from '../../hooks/useFriends'
import { useMyPresence, useMultiPresence, usePartnerPresence } from '../../hooks/usePresence'
import type { NetworkSpider } from '../../components/tracker/TrackerHeader'
import { removeFriend } from '../../services/firebase/friends'
import type { PresenceData, SharedEvent, UserProfile } from '../../types'
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
import { OnboardingChart } from '../../components/onboarding/OnboardingChart'
import { CharacterSheet } from '../../components/adventure/CharacterSheet'
import { FriendsHub } from '../../components/adventure/FriendsHub'
import { QuizModal } from '../../components/adventure/QuizModal'
import { MissionsPanel } from '../../components/adventure/MissionsPanel'
import { DiscoveriesPanel } from '../../components/adventure/DiscoveriesPanel'
import { normalizeAdventure, grantAchievement, bumpMission } from '../../services/firebase/adventure'
import { EventModal } from '../../components/events/EventModal'
import { EventInfoPanel } from '../../components/events/EventInfoPanel'
import { EventsPanel } from '../../components/events/EventsPanel'
import { PixelLoader } from '../../components/pixel/PixelLoader'
import { PixelButton } from '../../components/pixel/PixelButton'
import { formatDistance, formatRelativeTime, haversineDistanceKm } from '../../utils/geo'
import { setSoundEnabled, playRingtone, playSound, unlockAudio } from '../../services/sound/audio'
import { updatePreferences } from '../../services/firebase/users'
import { sendPartnerNudge, subscribeToNudges } from '../../services/firebase/nudge'
import { isFirebaseConfigured } from '../../services/firebase/config'

export function TrackerPage() {
  const { profile, loading, signOut, refreshProfile } = useAuth()
  const { partner } = usePartner(profile?.partnerId)
  const friends = useFriends(profile?.friendIds)
  const myPresence = useMyPresence(profile?.uid)
  const partnerPresence = usePartnerPresence(profile?.partnerId)
  const friendPresence = useMultiPresence(profile?.friendIds, profile?.uid)
  const location = useLocationSharing(profile?.uid, profile?.preferences)
  const { events, addEvent } = useEvents(profile?.relationshipId)
  const online = useOnlineStatus()
  const now = useNow(1000)

  const [activeControl, setActiveControl] = useState<ControlId | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [partnerOpen, setPartnerOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [eventsListOpen, setEventsListOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<SharedEvent | null>(null)
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number; nonce: number } | null>(null)
  const [logoTaps, setLogoTaps] = useState(0)
  const [easterEgg, setEasterEgg] = useState(false)
  const [nudgeBusy, setNudgeBusy] = useState(false)
  const [nudgeCooldown, setNudgeCooldown] = useState(false)
  const [nudgeBanner, setNudgeBanner] = useState<string | null>(null)
  const [focusSpider, setFocusSpider] = useState<{
    profile: UserProfile
    kind: 'partner' | 'friend'
  } | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [guideFirstRun, setGuideFirstRun] = useState(false)
  const [characterOpen, setCharacterOpen] = useState(false)
  const [friendsHubOpen, setFriendsHubOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [missionsOpen, setMissionsOpen] = useState(false)
  const [discoveriesOpen, setDiscoveriesOpen] = useState(false)
  const prevPartnerId = useRef<string | null | undefined>(undefined)
  const prevFriendCount = useRef<number | undefined>(undefined)
  const guideAutoShown = useRef(false)
  const adventure = useMemo(
    () => (profile ? normalizeAdventure(profile.adventure) : null),
    [profile],
  )

  useEffect(() => {
    if (profile) {
      setSoundEnabled(profile.preferences.soundEnabled)
      document.documentElement.classList.toggle('reduce-motion', profile.preferences.reduceMotion)
    }
  }, [profile])

  // First tracker visit after login/setup — show onboarding chart once
  useEffect(() => {
    if (!profile?.onboardingComplete || guideAutoShown.current) return
    if (profile.preferences.hasSeenGuide) return
    guideAutoShown.current = true
    setGuideFirstRun(true)
    setGuideOpen(true)
  }, [profile?.onboardingComplete, profile?.preferences.hasSeenGuide, profile])

  const closeGuide = useCallback(() => {
    setGuideOpen(false)
    setGuideFirstRun(false)
    if (profile && !profile.preferences.hasSeenGuide) {
      void updatePreferences(profile.uid, { hasSeenGuide: true })
    }
  }, [profile])

  const openGuide = useCallback(() => {
    setGuideFirstRun(false)
    setGuideOpen(true)
  }, [])

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
      void grantAchievement(profile.uid, 'linked_partner')
    }
    prevPartnerId.current = next
  }, [profile?.partnerId, profile])

  // Notify when a new friend joins the web
  useEffect(() => {
    if (!profile) return
    const count = profile.friendIds?.length ?? 0
    if (prevFriendCount.current === undefined) {
      prevFriendCount.current = count
      return
    }
    if (count > prevFriendCount.current) {
      void playRingtone()
      setNudgeBanner('FRIEND ADDED TO YOUR WEB')
      window.setTimeout(() => setNudgeBanner(null), 4000)
    }
    prevFriendCount.current = count
  }, [profile?.friendIds?.length, profile])

  // Incoming partner / friend nudges
  useEffect(() => {
    if (!profile?.uid || !isFirebaseConfigured) return
    return subscribeToNudges(profile.uid, (nudge) => {
      void playRingtone()
      setNudgeBanner(`NUDGE FROM ${nudge.fromName.toUpperCase()}`)
      window.setTimeout(() => setNudgeBanner(null), 5000)
    })
  }, [profile?.uid])

  const focusPresence: PresenceData = useMemo(() => {
    if (!focusSpider) return partnerPresence
    if (focusSpider.kind === 'partner') return partnerPresence
    return friendPresence[focusSpider.profile.uid] ?? partnerPresence
  }, [focusSpider, partnerPresence, friendPresence])

  const sendNudge = useCallback(async () => {
    const targetUid = focusSpider?.profile.uid ?? profile?.partnerId
    if (!profile || !targetUid || nudgeBusy || nudgeCooldown) return
    setNudgeBusy(true)
    try {
      await unlockAudio()
      await sendPartnerNudge(targetUid, profile.uid, profile.displayName)
      playSound('nudge')
      void bumpMission(profile.uid, 'daily_nudge', 1)
      void bumpMission(profile.uid, 'social_nudge_3', 1)
      setNudgeCooldown(true)
      window.setTimeout(() => setNudgeCooldown(false), 15_000)
    } catch {
      playSound('error')
    } finally {
      setNudgeBusy(false)
    }
  }, [profile, focusSpider, nudgeBusy, nudgeCooldown])

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

  const onlineFriends = useMemo(
    () => friends.filter((f) => friendPresence[f.uid]?.online).length,
    [friends, friendPresence],
  )

  const tickerMessages = useMemo(() => {
    const msgs: string[] = []
    msgs.push(online ? 'WEB NETWORK: ONLINE' : 'WEB CONNECTION LOST')
    if (partner && partnerPresence.online) msgs.push('TWO SPIDERS ACTIVE')
    if (friends.length) msgs.push(`${friends.length} FRIEND${friends.length === 1 ? '' : 'S'} ON YOUR WEB`)
    if (onlineFriends) msgs.push(`${onlineFriends} FRIEND SIGNAL${onlineFriends === 1 ? '' : 'S'} LIVE`)
    if (partner && partnerPresence.online && myPresence.online) msgs.push('SPIDER SENSE: DOUBLE SIGNAL')
    if (nearby) msgs.push('TWO SPIDERS DETECTED IN PROXIMITY')
    if (partnerPresence.locationSharingEnabled && partnerPresence.timestamp) {
      msgs.push(`LAST LOCATION UPDATE: ${formatRelativeTime(partnerPresence.timestamp, now)}`)
    } else if (partner) {
      msgs.push(partnerPresence.locationSharingEnabled ? 'SIGNAL WEAK' : 'PARTNER LOCATION CLOAKED')
    } else if (!friends.length) {
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
    friends.length,
    onlineFriends,
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

  const findSpider = useCallback(
    (presence?: PresenceData | null) => {
      const p = presence ?? focusPresence ?? partnerPresence
      if (p.latitude == null || p.longitude == null) return
      if (!p.locationSharingEnabled) return
      playSound('signal')
      setFlyTo({
        lat: p.latitude,
        lng: p.longitude,
        zoom: 14,
        nonce: Date.now(),
      })
    },
    [focusPresence, partnerPresence],
  )

  const openSpider = useCallback(
    (spider: NetworkSpider) => {
      setFocusSpider({ profile: spider.profile, kind: spider.kind })
      setPartnerOpen(true)
      findSpider(spider.presence)
    },
    [findSpider],
  )

  const openSpiderById = useCallback(
    (uid: string, kind: 'partner' | 'friend') => {
      if (kind === 'partner' && partner) {
        openSpider({ profile: partner, kind: 'partner', presence: partnerPresence })
        return
      }
      const friend = friends.find((f) => f.uid === uid)
      if (friend) {
        openSpider({ profile: friend, kind: 'friend', presence: friendPresence[uid] })
      }
    },
    [partner, partnerPresence, friends, friendPresence, openSpider],
  )

  const worldView = useCallback(() => {
    setFlyTo({ lat: 20, lng: 0, zoom: 2, nonce: Date.now() })
  }, [])

  const onControl = (id: ControlId) => {
    setActiveControl(id)
    playSound('click')
    if (id === 'me') centerMe()
    if (id === 'partner') {
      if (partner) {
        setFocusSpider({ profile: partner, kind: 'partner' })
        findSpider(partnerPresence)
        setPartnerOpen(true)
      } else if (friends[0]) {
        openSpider({
          profile: friends[0],
          kind: 'friend',
          presence: friendPresence[friends[0].uid],
        })
      } else setLinkOpen(true)
    }
    if (id === 'events') setEventsListOpen(true)
    if (id === 'info') openGuide()
  }

  const onLogoClick = () => {
    const next = logoTaps + 1
    setLogoTaps(next)
    if (next >= 5) {
      setEasterEgg(true)
      playSound('connect')
      setLogoTaps(0)
      window.setTimeout(() => setEasterEgg(false), 4000)
      if (profile) void grantAchievement(profile.uid, 'night_owl')
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
        spriteLevel={adventure?.level}
        onSpriteClick={() => {
          playSound('click')
          setCharacterOpen(true)
        }}
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
          ) : adventure ? (
            <div className="pixel-panel px-3 py-2 text-center">
              <p className="pixel-label" style={{ color: 'var(--spidey-cyan)', fontSize: 8 }}>
                LVL {adventure.level} · {profile.friendIds.length} FRIENDS · TAP YOUR SPIDER
              </p>
            </div>
          ) : null
        }
        header={
          <TrackerHeader
            user={profile}
            partner={partner}
            friends={friends}
            friendPresence={friendPresence}
            partnerPresence={partnerPresence}
            userOnline={myPresence.online}
            partnerOnline={partnerPresence.online}
            partnerLastSeen={partnerPresence.lastSeen}
            now={now}
            onUserClick={() => setProfileOpen(true)}
            onPartnerClick={() => {
              if (partner) {
                setFocusSpider({ profile: partner, kind: 'partner' })
                setPartnerOpen(true)
              } else setLinkOpen(true)
            }}
            onSelectSpider={openSpider}
            onLogoClick={onLogoClick}
          />
        }
        sideControls={
          <SideControls
            active={activeControl}
            onSelect={onControl}
            partnerOnline={partnerPresence.online || onlineFriends > 0}
          />
        }
        map={
          <TrackerMap
            user={profile}
            partner={partner}
            friends={friends}
            friendPresence={friendPresence}
            myPresence={myPresence}
            partnerPresence={partnerPresence}
            events={events}
            flyTo={flyTo}
            onEventClick={setSelectedEvent}
            onSpiderClick={openSpiderById}
            discoveredIds={adventure?.discoveries ?? []}
            showDiscoveries
            onDiscoveryClick={() => setDiscoveriesOpen(true)}
            now={now}
            mySharingEnabled={location.sharing}
            onEnableSharing={() => void location.setSharing(true)}
          />
        }
        toolbar={
          <MapToolbar
            onCenterMe={centerMe}
            onFindSpider={() => findSpider()}
            onWorldView={worldView}
            onEvents={() => setEventsListOpen(true)}
            onLocation={() => setProfileOpen(true)}
            onQuiz={() => setQuizOpen(true)}
            onMissions={() => setMissionsOpen(true)}
            onFriends={() => setFriendsHubOpen(true)}
            hasPartnerLocation={Boolean(
              (focusPresence?.locationSharingEnabled &&
                focusPresence.latitude != null &&
                focusPresence.longitude != null) ||
                (partnerPresence.locationSharingEnabled &&
                  partnerPresence.latitude != null &&
                  partnerPresence.longitude != null) ||
                friends.some((f) => {
                  const p = friendPresence[f.uid]
                  return p?.locationSharingEnabled && p.latitude != null && p.longitude != null
                }),
            )}
          />
        }
        linkAction={
          !profile.partnerId && !(profile.friendIds?.length) ? (
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

      <OnboardingChart open={guideOpen} onClose={closeGuide} firstRun={guideFirstRun} />

      <CharacterSheet
        open={characterOpen}
        profile={profile}
        onClose={() => setCharacterOpen(false)}
        onEditCharacter={() => {
          setCharacterOpen(false)
          setProfileOpen(true)
        }}
        onOpenMissions={() => {
          setCharacterOpen(false)
          setMissionsOpen(true)
        }}
        onOpenQuiz={() => {
          setCharacterOpen(false)
          setQuizOpen(true)
        }}
        onOpenFriends={() => {
          setCharacterOpen(false)
          setFriendsHubOpen(true)
        }}
        onChanged={() => void refreshProfile()}
      />

      <FriendsHub
        open={friendsHubOpen}
        profile={profile}
        friendPresence={friendPresence}
        onClose={() => setFriendsHubOpen(false)}
        onChanged={() => void refreshProfile()}
        onSelectFriend={(uid) => {
          setFriendsHubOpen(false)
          openSpiderById(uid, 'friend')
        }}
      />

      <QuizModal
        open={quizOpen}
        uid={profile.uid}
        streak={adventure?.quizStreak ?? 0}
        onClose={() => setQuizOpen(false)}
        onFinished={(summary) => {
          void refreshProfile()
          setNudgeBanner(summary)
          window.setTimeout(() => setNudgeBanner(null), 4000)
        }}
      />

      <MissionsPanel
        open={missionsOpen}
        profile={profile}
        onClose={() => setMissionsOpen(false)}
        onOpenQuiz={() => {
          setMissionsOpen(false)
          setQuizOpen(true)
        }}
        onOpenDiscoveries={() => {
          setMissionsOpen(false)
          setDiscoveriesOpen(true)
        }}
      />

      <DiscoveriesPanel
        open={discoveriesOpen}
        profile={profile}
        myLat={myPresence.latitude}
        myLng={myPresence.longitude}
        onClose={() => setDiscoveriesOpen(false)}
        onChanged={() => void refreshProfile()}
        onFlyTo={(lat, lng) => setFlyTo({ lat, lng, zoom: 15, nonce: Date.now() })}
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
        onOpenGuide={() => {
          setProfileOpen(false)
          openGuide()
        }}
        sharing={location.sharing}
        precise={location.precise}
        onToggleSharing={(v) => {
          void location.setSharing(v)
          if (v) void bumpMission(profile.uid, 'daily_share', 1)
        }}
        onTogglePrecise={(v) => void location.setPrecise(v)}
      />

      <PartnerPanel
        open={partnerOpen}
        partner={focusSpider?.profile ?? partner}
        kind={focusSpider?.kind ?? 'partner'}
        presence={focusPresence}
        now={now}
        onClose={() => {
          setPartnerOpen(false)
          setFocusSpider(null)
        }}
        onFind={() => findSpider(focusPresence)}
        onNudge={() => void sendNudge()}
        nudgeBusy={nudgeBusy}
        nudgeCooldown={nudgeCooldown}
        onUnlink={() => {
          const kind = focusSpider?.kind ?? 'partner'
          const target = focusSpider?.profile ?? partner
          setPartnerOpen(false)
          if (kind === 'friend' && target && profile) {
            void removeFriend(profile, target.uid)
              .then(() => refreshProfile())
              .catch(() => playSound('error'))
            setFocusSpider(null)
            return
          }
          setFocusSpider(null)
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

      <EventsPanel
        open={eventsListOpen}
        events={events}
        myUid={profile.uid}
        myName={profile.displayName}
        partnerName={partner?.displayName}
        hasRelationship={Boolean(profile.relationshipId)}
        onClose={() => setEventsListOpen(false)}
        onCreate={() => {
          setEventsListOpen(false)
          setEventOpen(true)
        }}
        onSelect={(ev) => {
          setEventsListOpen(false)
          setSelectedEvent(ev)
        }}
        onFlyTo={(ev) => {
          setEventsListOpen(false)
          setFlyTo({ lat: ev.latitude, lng: ev.longitude, zoom: 15, nonce: Date.now() })
          setSelectedEvent(ev)
        }}
      />

      <EventModal
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        defaultLat={myPresence.latitude ?? undefined}
        defaultLng={myPresence.longitude ?? undefined}
        onSave={async (data) => {
          if (!profile.relationshipId) throw new Error('LINK A PARTNER FIRST')
          await addEvent({ ...data, createdBy: profile.uid })
          setEventsListOpen(true)
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
        onFlyTo={(ev) =>
          setFlyTo({ lat: ev.latitude, lng: ev.longitude, zoom: 15, nonce: Date.now() })
        }
      />
    </>
  )
}

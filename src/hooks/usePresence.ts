import { useEffect, useRef, useState } from 'react'
import type { PresenceData } from '../types'
import {
  initializePresenceDoc,
  setupPresence,
  subscribeToPresence,
  syncFriendAccessList,
} from '../services/firebase/presence'
import { isFirebaseConfigured } from '../services/firebase/config'

const EMPTY: PresenceData = {
  online: false,
  lastSeen: 0,
  locationSharingEnabled: false,
  preciseLocationEnabled: true,
  latitude: null,
  longitude: null,
  accuracy: null,
  heading: null,
  speed: null,
  timestamp: null,
}

/** Keep last known coords while sharing stays on (avoids pin flicker on brief RTDB gaps). */
function mergeSticky(prev: PresenceData | undefined, next: PresenceData): PresenceData {
  if (!next.locationSharingEnabled) return next
  if (next.latitude != null && next.longitude != null) return next
  if (prev?.latitude != null && prev?.longitude != null) {
    return {
      ...next,
      latitude: prev.latitude,
      longitude: prev.longitude,
      accuracy: next.accuracy ?? prev.accuracy,
      timestamp: next.timestamp ?? prev.timestamp,
    }
  }
  return next
}

export function useMyPresence(uid: string | undefined) {
  const [presence, setPresence] = useState<PresenceData>(EMPTY)

  useEffect(() => {
    if (!uid || !isFirebaseConfigured) return

    let cleanupPresence: (() => void) | undefined
    let unsub: (() => void) | undefined

    void (async () => {
      await initializePresenceDoc(uid)
      cleanupPresence = await setupPresence(uid)
      unsub = subscribeToPresence(uid, setPresence)
    })()

    return () => {
      cleanupPresence?.()
      unsub?.()
    }
  }, [uid])

  return presence
}

export function usePartnerPresence(partnerId: string | null | undefined) {
  const [presence, setPresence] = useState<PresenceData>(EMPTY)
  const sticky = useRef<PresenceData>(EMPTY)

  useEffect(() => {
    if (!partnerId || !isFirebaseConfigured) {
      sticky.current = EMPTY
      setPresence(EMPTY)
      return
    }
    return subscribeToPresence(partnerId, (data) => {
      const merged = mergeSticky(sticky.current, data)
      sticky.current = merged
      setPresence(merged)
    })
  }, [partnerId])

  return presence
}

/**
 * Presence for friends. Syncs friendAccess mirrors before listening so RTDB rules
 * allow reads (fixes intermittent missing friend pins).
 */
export function useMultiPresence(
  uids: string[] | undefined,
  viewerUid?: string | null,
) {
  const [map, setMap] = useState<Record<string, PresenceData>>({})
  const stickyRef = useRef<Record<string, PresenceData>>({})
  const idsKey = (uids ?? []).slice().sort().join(',')

  useEffect(() => {
    if (!idsKey || !viewerUid || !isFirebaseConfigured) {
      stickyRef.current = {}
      setMap({})
      return
    }

    const ids = idsKey.split(',')
    let cancelled = false
    const unsubs: Array<() => void> = []
    let retryTimer: number | undefined

    const attach = () => {
      unsubs.splice(0).forEach((u) => u())
      for (const id of ids) {
        const unsub = subscribeToPresence(
          id,
          (data) => {
            if (cancelled) return
            const merged = mergeSticky(stickyRef.current[id], data)
            stickyRef.current[id] = merged
            setMap((prev) => ({ ...prev, [id]: merged }))
          },
          () => {
            // Permission denied until mirror sync — retry once
            if (cancelled) return
            window.clearTimeout(retryTimer)
            retryTimer = window.setTimeout(() => {
              if (cancelled) return
              void syncFriendAccessList(viewerUid, ids).then(() => {
                if (!cancelled) attach()
              })
            }, 600)
          },
        )
        unsubs.push(unsub)
      }
    }

    void (async () => {
      try {
        await syncFriendAccessList(viewerUid, ids)
      } catch {
        // still attempt listen; retry path may recover
      }
      if (cancelled) return
      attach()
    })()

    return () => {
      cancelled = true
      window.clearTimeout(retryTimer)
      unsubs.forEach((u) => u())
    }
  }, [idsKey, viewerUid])

  return map
}

import { useEffect, useState } from 'react'
import type { PresenceData } from '../types'
import {
  initializePresenceDoc,
  setupPresence,
  subscribeToPresence,
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

  useEffect(() => {
    if (!partnerId || !isFirebaseConfigured) {
      setPresence(EMPTY)
      return
    }
    return subscribeToPresence(partnerId, setPresence)
  }, [partnerId])

  return presence
}

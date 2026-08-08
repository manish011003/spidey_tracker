import {
  ref,
  set,
  update,
  onValue,
  onDisconnect,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/database'
import type { PresenceData } from '../../types'
import { requireRtdb } from './config'

const EMPTY_PRESENCE: PresenceData = {
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

export async function setupPresence(uid: string): Promise<() => void> {
  const rtdb = requireRtdb()
  const statusRef = ref(rtdb, `presence/${uid}`)
  const connectedRef = ref(rtdb, '.info/connected')

  let unsub: Unsubscribe | null = null

  unsub = onValue(connectedRef, async (snap) => {
    if (snap.val() === false) return

    await onDisconnect(statusRef).update({
      online: false,
      lastSeen: serverTimestamp(),
    })

    await update(statusRef, {
      online: true,
      lastSeen: serverTimestamp(),
    })
  })

  return () => {
    unsub?.()
    void update(statusRef, {
      online: false,
      lastSeen: Date.now(),
    })
  }
}

export async function publishLocation(
  uid: string,
  data: {
    latitude: number
    longitude: number
    accuracy: number | null
    heading: number | null
    speed: number | null
    locationSharingEnabled: boolean
    preciseLocationEnabled: boolean
  },
): Promise<void> {
  const rtdb = requireRtdb()
  await update(ref(rtdb, `presence/${uid}`), {
    ...data,
    online: true,
    timestamp: Date.now(),
    lastSeen: serverTimestamp(),
  })
}

export async function setLocationSharing(
  uid: string,
  enabled: boolean,
  precise: boolean,
): Promise<void> {
  const rtdb = requireRtdb()
  const payload: Record<string, unknown> = {
    locationSharingEnabled: enabled,
    preciseLocationEnabled: precise,
    lastSeen: serverTimestamp(),
  }
  if (!enabled) {
    payload.latitude = null
    payload.longitude = null
    payload.accuracy = null
    payload.heading = null
    payload.speed = null
    payload.timestamp = null
  }
  await update(ref(rtdb, `presence/${uid}`), payload)
}

function mapPresenceSnap(snap: { exists: () => boolean; val: () => unknown }): PresenceData {
  if (!snap.exists()) return { ...EMPTY_PRESENCE }
  const val = snap.val() as Partial<PresenceData> & { lastSeen?: number | object }
  const lastSeen =
    typeof val.lastSeen === 'number'
      ? val.lastSeen
      : val.lastSeen && typeof val.lastSeen === 'object'
        ? Date.now()
        : 0

  return {
    online: Boolean(val.online),
    lastSeen,
    locationSharingEnabled: Boolean(val.locationSharingEnabled),
    preciseLocationEnabled: val.preciseLocationEnabled !== false,
    latitude: typeof val.latitude === 'number' ? val.latitude : null,
    longitude: typeof val.longitude === 'number' ? val.longitude : null,
    accuracy: typeof val.accuracy === 'number' ? val.accuracy : null,
    heading: typeof val.heading === 'number' ? val.heading : null,
    speed: typeof val.speed === 'number' ? val.speed : null,
    timestamp: typeof val.timestamp === 'number' ? val.timestamp : null,
  }
}

export function subscribeToPresence(
  uid: string,
  callback: (data: PresenceData) => void,
  onError?: (error: Error) => void,
): () => void {
  const rtdb = requireRtdb()
  const statusRef = ref(rtdb, `presence/${uid}`)
  return onValue(
    statusRef,
    (snap) => {
      callback(mapPresenceSnap(snap))
    },
    (err) => {
      callback({ ...EMPTY_PRESENCE })
      onError?.(err instanceof Error ? err : new Error(String(err)))
    },
  )
}

export async function initializePresenceDoc(uid: string): Promise<void> {
  const rtdb = requireRtdb()
  await set(ref(rtdb, `presence/${uid}`), {
    online: true,
    lastSeen: serverTimestamp(),
    locationSharingEnabled: false,
    preciseLocationEnabled: true,
    latitude: null,
    longitude: null,
    accuracy: null,
    heading: null,
    speed: null,
    timestamp: null,
  })
}

/** Mirror Firestore partner link into RTDB so presence read rules can authorize partner access. */
export async function syncPartnerAccess(uid: string, partnerId: string | null): Promise<void> {
  const rtdb = requireRtdb()
  await set(ref(rtdb, `partnerAccess/${uid}/partnerId`), partnerId)
}

/**
 * Mirror Firestore friendIds into RTDB under friendAccess/{uid}.
 * Each user can only write their own node (rules) — call on profile load/update.
 */
export async function syncFriendAccessList(uid: string, friendIds: string[]): Promise<void> {
  const rtdb = requireRtdb()
  const payload: Record<string, boolean> = {}
  for (const id of friendIds) {
    if (id && id !== uid) payload[id] = true
  }
  // Replace the whole map so removed friends lose access
  await set(ref(rtdb, `friendAccess/${uid}`), payload)
}

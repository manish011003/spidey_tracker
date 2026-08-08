import { ref, set, onValue, remove, type Unsubscribe } from 'firebase/database'
import { requireRtdb } from './config'

export type NudgePayload = {
  fromUid: string
  fromName: string
  timestamp: number
}

/** Send a spider nudge to your linked partner (plays ringtone on their side). */
export async function sendPartnerNudge(
  toUid: string,
  fromUid: string,
  fromName: string,
): Promise<void> {
  const rtdb = requireRtdb()
  await set(ref(rtdb, `nudges/${toUid}`), {
    fromUid,
    fromName,
    timestamp: Date.now(),
  } satisfies NudgePayload)
}

/** Listen for incoming nudges addressed to this user. */
export function subscribeToNudges(
  uid: string,
  onNudge: (nudge: NudgePayload) => void,
): Unsubscribe {
  const rtdb = requireRtdb()
  const nudgeRef = ref(rtdb, `nudges/${uid}`)
  return onValue(nudgeRef, (snap) => {
    if (!snap.exists()) return
    const val = snap.val() as NudgePayload
    if (!val?.fromUid || !val.timestamp) return
    // Ignore stale nudges older than 30s (e.g. reconnect catch-up)
    if (Date.now() - val.timestamp > 30_000) {
      void remove(nudgeRef)
      return
    }
    onNudge(val)
    void remove(nudgeRef)
  })
}

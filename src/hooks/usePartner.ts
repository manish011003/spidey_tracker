import { useEffect, useState } from 'react'
import type { UserProfile } from '../types'
import { getPartnerProfile } from '../services/firebase/relationships'
import { isFirebaseConfigured } from '../services/firebase/config'
import { doc, onSnapshot } from 'firebase/firestore'
import { requireDb } from '../services/firebase/config'
import { mapUserDoc } from '../services/firebase/users'

export function usePartner(partnerId: string | null | undefined) {
  const [partner, setPartner] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(Boolean(partnerId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!partnerId || !isFirebaseConfigured) {
      setPartner(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const db = requireDb()
    const unsub = onSnapshot(
      doc(db, 'users', partnerId),
      (snap) => {
        if (snap.exists()) {
          setPartner(mapUserDoc(partnerId, snap.data() as Record<string, unknown>))
          setError(null)
        } else {
          setPartner(null)
          setError('PARTNER PROFILE MISSING')
        }
        setLoading(false)
      },
      () => {
        setError('FAILED TO LOAD PARTNER')
        setLoading(false)
      },
    )
    return unsub
  }, [partnerId])

  return { partner, loading, error, reload: () => (partnerId ? getPartnerProfile(partnerId) : null) }
}

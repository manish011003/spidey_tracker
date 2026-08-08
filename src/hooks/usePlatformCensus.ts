import { useCallback, useEffect, useState } from 'react'
import { collection, getCountFromServer, query, where } from 'firebase/firestore'
import { isFirebaseConfigured, requireDb } from '../services/firebase/config'

/** Live-ish count of onboarded spiders on the platform. */
export function usePlatformCensus(enabled = true) {
  const [count, setCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || !isFirebaseConfigured) {
      setCount(null)
      return
    }
    try {
      const db = requireDb()
      const q = query(collection(db, 'users'), where('onboardingComplete', '==', true))
      const snap = await getCountFromServer(q)
      setCount(snap.data().count)
      setError(null)
    } catch (e) {
      console.warn('[census] count failed', e)
      setError(e instanceof Error ? e.message : 'CENSUS FAILED')
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
    if (!enabled) return
    const id = window.setInterval(() => void refresh(), 60_000)
    return () => window.clearInterval(id)
  }, [enabled, refresh])

  return { count, error, refresh }
}

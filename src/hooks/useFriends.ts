import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import type { UserProfile } from '../types'
import { isFirebaseConfigured, requireDb } from '../services/firebase/config'
import { mapUserDoc } from '../services/firebase/users'

/** Live profiles for everyone in `friendIds`. */
export function useFriends(friendIds: string[] | undefined) {
  const [friends, setFriends] = useState<UserProfile[]>([])
  const idsKey = (friendIds ?? []).slice().sort().join(',')

  useEffect(() => {
    if (!idsKey || !isFirebaseConfigured) {
      setFriends([])
      return
    }
    const ids = idsKey.split(',')
    const db = requireDb()
    const map = new Map<string, UserProfile>()
    const unsubs = ids.map((id) =>
      onSnapshot(
        doc(db, 'users', id),
        (snap) => {
          if (snap.exists()) {
            map.set(id, mapUserDoc(id, snap.data() as Record<string, unknown>))
          } else {
            map.delete(id)
          }
          setFriends(ids.map((fid) => map.get(fid)).filter(Boolean) as UserProfile[])
        },
        () => {
          map.delete(id)
          setFriends(ids.map((fid) => map.get(fid)).filter(Boolean) as UserProfile[])
        },
      ),
    )
    return () => unsubs.forEach((u) => u())
  }, [idsKey])

  return friends
}

import {
  doc,
  runTransaction,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import { ref, set, remove } from 'firebase/database'
import type { UserProfile } from '../../types'
import { normalizePartnerCode, isValidPartnerCodeFormat } from '../../utils/partnerCode'
import { findUserByPartnerCode } from './users'
import { requireDb, requireRtdb } from './config'

const MAX_FRIENDS = 12

async function syncFriendAccess(uid: string, friendId: string, linked: boolean): Promise<void> {
  const rtdb = requireRtdb()
  const path = ref(rtdb, `friendAccess/${uid}/${friendId}`)
  if (linked) await set(path, true)
  else await remove(path)
}

/** Add another spider as a friend (not the exclusive BF/GF partner slot). */
export async function addFriend(
  currentUser: UserProfile,
  rawCode: string,
): Promise<UserProfile> {
  const code = normalizePartnerCode(rawCode)
  if (!isValidPartnerCodeFormat(code)) throw new Error('INVALID SPIDER CODE FORMAT')
  if (code === currentUser.partnerCode) throw new Error('CANNOT ADD YOURSELF')

  const friend = await findUserByPartnerCode(code)
  if (!friend) throw new Error('SPIDER SIGNAL NOT FOUND — INVALID CODE')
  if (!friend.onboardingComplete) throw new Error('FRIEND HAS NOT COMPLETED SETUP')
  if (friend.uid === currentUser.partnerId) throw new Error('ALREADY YOUR PARTNER')
  if (currentUser.friendIds.includes(friend.uid)) throw new Error('ALREADY FRIENDS')
  if (currentUser.friendIds.length >= MAX_FRIENDS) throw new Error('FRIEND WEB FULL')

  const db = requireDb()
  await runTransaction(db, async (tx) => {
    const meRef = doc(db, 'users', currentUser.uid)
    const friendRef = doc(db, 'users', friend.uid)
    const meSnap = await tx.get(meRef)
    const friendSnap = await tx.get(friendRef)
    if (!meSnap.exists() || !friendSnap.exists()) throw new Error('SPIDER PROFILE MISSING')

    const meFriends = (meSnap.data().friendIds as string[] | undefined) ?? []
    const theirFriends = (friendSnap.data().friendIds as string[] | undefined) ?? []
    if (meFriends.includes(friend.uid)) throw new Error('ALREADY FRIENDS')
    if (meFriends.length >= MAX_FRIENDS || theirFriends.length >= MAX_FRIENDS) {
      throw new Error('FRIEND WEB FULL')
    }

    tx.update(meRef, {
      friendIds: arrayUnion(friend.uid),
      updatedAt: serverTimestamp(),
    })
    tx.update(friendRef, {
      friendIds: arrayUnion(currentUser.uid),
      updatedAt: serverTimestamp(),
    })
  })

  await Promise.all([
    syncFriendAccess(currentUser.uid, friend.uid, true),
    syncFriendAccess(friend.uid, currentUser.uid, true),
  ])

  return friend
}

export async function removeFriend(currentUser: UserProfile, friendId: string): Promise<void> {
  const db = requireDb()
  await runTransaction(db, async (tx) => {
    const meRef = doc(db, 'users', currentUser.uid)
    const friendRef = doc(db, 'users', friendId)
    tx.update(meRef, {
      friendIds: arrayRemove(friendId),
      updatedAt: serverTimestamp(),
    })
    tx.update(friendRef, {
      friendIds: arrayRemove(currentUser.uid),
      updatedAt: serverTimestamp(),
    })
  })
  await Promise.all([
    syncFriendAccess(currentUser.uid, friendId, false),
    syncFriendAccess(friendId, currentUser.uid, false),
  ])
}

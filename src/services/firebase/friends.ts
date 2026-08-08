import {
  doc,
  runTransaction,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import type { UserProfile } from '../../types'
import { normalizePartnerCode, isValidPartnerCodeFormat } from '../../utils/partnerCode'
import { findUserByPartnerCode, getUserProfile } from './users'
import { requireDb } from './config'
import { syncFriendAccessList } from './presence'
import { awardXp, bumpMission, grantAchievement } from './adventure'

const MAX_FRIENDS = 12

async function linkFriends(me: UserProfile, friend: UserProfile): Promise<void> {
  const db = requireDb()
  await runTransaction(db, async (tx) => {
    const meRef = doc(db, 'users', me.uid)
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
      incomingFriendRequests: arrayRemove(friend.uid),
      outgoingFriendRequests: arrayRemove(friend.uid),
      updatedAt: serverTimestamp(),
    })
    tx.update(friendRef, {
      friendIds: arrayUnion(me.uid),
      incomingFriendRequests: arrayRemove(me.uid),
      outgoingFriendRequests: arrayRemove(me.uid),
      updatedAt: serverTimestamp(),
    })
  })

  // Each user can only write their own friendAccess node
  await syncFriendAccessList(me.uid, [...me.friendIds, friend.uid])

  if (me.friendIds.length === 0) {
    await grantAchievement(me.uid, 'friend_circle')
    await awardXp(me.uid, 30)
  }
  await bumpMission(me.uid, 'weekly_friends', 1)
}

/** Send a friend request by spider code (not auto-link). */
export async function sendFriendRequest(
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
  if (currentUser.outgoingFriendRequests.includes(friend.uid)) throw new Error('REQUEST ALREADY SENT')
  if (currentUser.incomingFriendRequests.includes(friend.uid)) {
    // They already requested you — accept
    await acceptFriendRequest(currentUser, friend.uid)
    return friend
  }

  const db = requireDb()
  await runTransaction(db, async (tx) => {
    const meRef = doc(db, 'users', currentUser.uid)
    const friendRef = doc(db, 'users', friend.uid)
    tx.update(meRef, {
      outgoingFriendRequests: arrayUnion(friend.uid),
      updatedAt: serverTimestamp(),
    })
    tx.update(friendRef, {
      incomingFriendRequests: arrayUnion(currentUser.uid),
      updatedAt: serverTimestamp(),
    })
  })

  return friend
}

/** @deprecated use sendFriendRequest — kept for older call sites */
export async function addFriend(currentUser: UserProfile, rawCode: string): Promise<UserProfile> {
  return sendFriendRequest(currentUser, rawCode)
}

export async function acceptFriendRequest(currentUser: UserProfile, fromUid: string): Promise<void> {
  if (!currentUser.incomingFriendRequests.includes(fromUid)) {
    throw new Error('NO PENDING REQUEST')
  }
  const friend = await getUserProfile(fromUid)
  if (!friend) throw new Error('SPIDER PROFILE MISSING')
  await linkFriends(currentUser, friend)
}

export async function declineFriendRequest(currentUser: UserProfile, fromUid: string): Promise<void> {
  const db = requireDb()
  await runTransaction(db, async (tx) => {
    tx.update(doc(db, 'users', currentUser.uid), {
      incomingFriendRequests: arrayRemove(fromUid),
      updatedAt: serverTimestamp(),
    })
    tx.update(doc(db, 'users', fromUid), {
      outgoingFriendRequests: arrayRemove(currentUser.uid),
      updatedAt: serverTimestamp(),
    })
  })
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
  await syncFriendAccessList(
    currentUser.uid,
    currentUser.friendIds.filter((id) => id !== friendId),
  )
}

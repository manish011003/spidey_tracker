import { deleteUser } from 'firebase/auth'
import { doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ref, remove } from 'firebase/database'
import type { UserProfile } from '../../types'
import { requireAuth, requireDb, requireRtdb } from './config'
import { unlinkPartner } from './relationships'
import { releasePartnerCode } from './partnerCodes'

/**
 * Permanently delete the signed-in user's account and private data.
 * Unlinks partner first (keeps shared event history on the relationship doc).
 */
export async function deleteAccount(profile: UserProfile): Promise<void> {
  const auth = requireAuth()
  const user = auth.currentUser
  if (!user || user.uid !== profile.uid) {
    throw new Error('NOT SIGNED IN')
  }

  if (profile.partnerId && profile.relationshipId) {
    try {
      await unlinkPartner(profile)
    } catch {
      // Still attempt local cleanup if partner already gone
      const db = requireDb()
      await updateDoc(doc(db, 'users', profile.uid), {
        partnerId: null,
        relationshipId: null,
        updatedAt: serverTimestamp(),
      })
    }
  }

  if (profile.partnerCode) {
    try {
      await releasePartnerCode(profile.partnerCode)
    } catch {
      // ignore missing code
    }
  }

  const rtdb = requireRtdb()
  await Promise.all([
    remove(ref(rtdb, `presence/${profile.uid}`)).catch(() => undefined),
    remove(ref(rtdb, `partnerAccess/${profile.uid}`)).catch(() => undefined),
  ])

  const db = requireDb()
  await deleteDoc(doc(db, 'users', profile.uid))

  try {
    await deleteUser(user)
  } catch (e) {
    const code = (e as { code?: string })?.code
    if (code === 'auth/requires-recent-login') {
      throw new Error('RE-AUTH REQUIRED — SIGN IN AGAIN, THEN DELETE')
    }
    throw new Error('FAILED TO DELETE AUTH IDENTITY')
  }
}

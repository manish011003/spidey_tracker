import {
  doc,
  getDoc,
  collection,
  serverTimestamp,
  runTransaction,
  type Timestamp,
} from 'firebase/firestore'
import type { Relationship, UserProfile } from '../../types'
import { normalizePartnerCode, isValidPartnerCodeFormat } from '../../utils/partnerCode'
import { findUserByPartnerCode, mapUserDoc } from './users'
import { requireDb } from './config'

function toMillis(value: unknown): number {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'toMillis' in value) {
    return (value as Timestamp).toMillis()
  }
  return Date.now()
}

export async function getRelationship(id: string): Promise<Relationship | null> {
  const db = requireDb()
  const snap = await getDoc(doc(db, 'relationships', id))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    id: snap.id,
    memberIds: data.memberIds as [string, string],
    createdAt: toMillis(data.createdAt),
    status: data.status as Relationship['status'],
  }
}

export async function linkPartner(
  currentUser: UserProfile,
  rawCode: string,
): Promise<{ relationshipId: string; partner: UserProfile }> {
  const code = normalizePartnerCode(rawCode)
  if (!isValidPartnerCodeFormat(code)) {
    throw new Error('INVALID SPIDER CODE FORMAT')
  }
  if (code === currentUser.partnerCode) {
    throw new Error('CANNOT LINK TO YOURSELF')
  }
  if (currentUser.partnerId || currentUser.relationshipId) {
    throw new Error('ALREADY LINKED TO A PARTNER')
  }

  const partner = await findUserByPartnerCode(code)
  if (!partner) {
    throw new Error('SPIDER SIGNAL NOT FOUND — INVALID CODE')
  }
  if (!partner.onboardingComplete) {
    throw new Error('PARTNER HAS NOT COMPLETED SETUP')
  }
  if (partner.partnerId || partner.relationshipId) {
    throw new Error('THAT SPIDER IS ALREADY LINKED')
  }

  const db = requireDb()
  const relationshipRef = doc(collection(db, 'relationships'))
  const relationshipId = relationshipRef.id

  await runTransaction(db, async (tx) => {
    const meRef = doc(db, 'users', currentUser.uid)
    const partnerRef = doc(db, 'users', partner.uid)
    const meSnap = await tx.get(meRef)
    const partnerSnap = await tx.get(partnerRef)

    if (!meSnap.exists() || !partnerSnap.exists()) {
      throw new Error('SPIDER PROFILE MISSING')
    }

    const meData = meSnap.data()
    const partnerData = partnerSnap.data()

    if (meData.partnerId || meData.relationshipId) {
      throw new Error('ALREADY LINKED TO A PARTNER')
    }
    if (partnerData.partnerId || partnerData.relationshipId) {
      throw new Error('THAT SPIDER IS ALREADY LINKED')
    }

    tx.set(relationshipRef, {
      memberIds: [currentUser.uid, partner.uid],
      createdAt: serverTimestamp(),
      status: 'active',
    })

    tx.update(meRef, {
      partnerId: partner.uid,
      relationshipId,
      updatedAt: serverTimestamp(),
    })

    tx.update(partnerRef, {
      partnerId: currentUser.uid,
      relationshipId,
      updatedAt: serverTimestamp(),
    })
  })

  // Each client mirrors partnerAccess for their own uid via profile listener (RTDB rules).
  return { relationshipId, partner }
}

export async function unlinkPartner(currentUser: UserProfile): Promise<void> {
  if (!currentUser.partnerId || !currentUser.relationshipId) {
    throw new Error('NO PARTNER LINKED')
  }

  const db = requireDb()
  const relationshipId = currentUser.relationshipId
  const partnerId = currentUser.partnerId

  await runTransaction(db, async (tx) => {
    const meRef = doc(db, 'users', currentUser.uid)
    const partnerRef = doc(db, 'users', partnerId)
    const relRef = doc(db, 'relationships', relationshipId)

    tx.update(meRef, {
      partnerId: null,
      relationshipId: null,
      updatedAt: serverTimestamp(),
    })

    tx.update(partnerRef, {
      partnerId: null,
      relationshipId: null,
      updatedAt: serverTimestamp(),
    })

    tx.update(relRef, {
      status: 'unlinked',
      unlinkedAt: serverTimestamp(),
    })
  })

  // partnerAccess cleared by each client's profile listener
}

export async function getPartnerProfile(partnerId: string): Promise<UserProfile | null> {
  const db = requireDb()
  const snap = await getDoc(doc(db, 'users', partnerId))
  if (!snap.exists()) return null
  return mapUserDoc(partnerId, snap.data() as Record<string, unknown>)
}


import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { requireDb } from './config'

export async function registerPartnerCode(code: string, uid: string): Promise<void> {
  const db = requireDb()
  await setDoc(doc(db, 'partnerCodes', code), { uid, createdAt: Date.now() })
}

export async function lookupPartnerCode(code: string): Promise<string | null> {
  const db = requireDb()
  const snap = await getDoc(doc(db, 'partnerCodes', code))
  if (!snap.exists()) return null
  return (snap.data().uid as string) ?? null
}

export async function releasePartnerCode(code: string): Promise<void> {
  const db = requireDb()
  await deleteDoc(doc(db, 'partnerCodes', code))
}

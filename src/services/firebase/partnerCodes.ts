import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { requireDb } from './config'

export async function registerPartnerCode(code: string, uid: string): Promise<void> {
  const db = requireDb()
  const ref = doc(db, 'partnerCodes', code)
  const existing = await getDoc(ref)
  if (existing.exists()) {
    const owner = existing.data()?.uid as string | undefined
    if (owner === uid) return
    throw new Error('SPIDER CODE TAKEN')
  }
  // create-only in rules — never overwrite another spider's code
  await setDoc(ref, { uid, createdAt: Date.now() })
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

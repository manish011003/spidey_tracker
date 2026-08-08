import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import type { UserPreferences, UserProfile, UserRole, SpiderId, SuitId } from '../../types'
import { generatePartnerCode } from '../../utils/partnerCode'
import { requireDb } from './config'
import { lookupPartnerCode, registerPartnerCode } from './partnerCodes'

function normalizeSuitId(id: string): SuitId {
  if (id === 'mystery') return 'ghost'
  return id as SuitId
}

const DEFAULT_PREFERENCES: UserPreferences = {
  soundEnabled: false,
  reduceMotion: false,
  skipBootAnimation: false,
  locationSharingEnabled: false,
  preciseLocationEnabled: true,
  hasSeenGuide: false,
}

function toMillis(value: unknown): number {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'toMillis' in value) {
    return (value as Timestamp).toMillis()
  }
  return Date.now()
}

export function mapUserDoc(uid: string, data: Record<string, unknown>): UserProfile {
  return {
    uid,
    displayName: (data.displayName as string) ?? 'Spider',
    nickname: data.nickname as string | undefined,
    email: (data.email as string) ?? '',
    photoURL: data.photoURL as string | undefined,
    role: data.role as UserRole,
    spiderId: (data.spiderId as SpiderId) ?? 'classic',
    suitId: normalizeSuitId((data.suitId as string) ?? 'classic'),
    statusMessage: (data.statusMessage as string | undefined) ?? undefined,
    partnerId: (data.partnerId as string | null) ?? null,
    partnerCode: (data.partnerCode as string) ?? '',
    relationshipId: (data.relationshipId as string | null) ?? null,
    friendIds: Array.isArray(data.friendIds) ? (data.friendIds as string[]) : [],
    onboardingComplete: Boolean(data.onboardingComplete),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...(data.preferences as Partial<UserPreferences> | undefined),
      // Mute by default unless explicitly enabled
      soundEnabled: Boolean((data.preferences as Partial<UserPreferences> | undefined)?.soundEnabled),
    },
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = requireDb()
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return mapUserDoc(uid, snap.data() as Record<string, unknown>)
}

export async function ensureUserShell(user: User): Promise<UserProfile> {
  const existing = await getUserProfile(user.uid)
  if (existing) return existing

  const db = requireDb()
  const now = Date.now()
  const profile: UserProfile = {
    uid: user.uid,
    displayName: user.displayName ?? 'Spider',
    email: user.email ?? '',
    photoURL: user.photoURL ?? undefined,
    role: 'boyfriend',
    spiderId: 'classic',
    suitId: 'classic',
    statusMessage: 'WEB SENSORS ONLINE',
    partnerId: null,
    partnerCode: generatePartnerCode(),
    relationshipId: null,
    friendIds: [],
    onboardingComplete: false,
    createdAt: now,
    updatedAt: now,
    preferences: { ...DEFAULT_PREFERENCES },
  }

  await setDoc(doc(db, 'users', user.uid), {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await registerPartnerCode(profile.partnerCode, user.uid)

  return profile
}

export async function completeOnboarding(
  uid: string,
  data: {
    role: UserRole
    spiderId: SpiderId
    suitId: SuitId
    displayName: string
    nickname?: string
  },
): Promise<void> {
  const db = requireDb()
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    onboardingComplete: true,
    updatedAt: serverTimestamp(),
  })
}

export async function updatePreferences(
  uid: string,
  preferences: Partial<UserPreferences>,
): Promise<void> {
  const db = requireDb()
  const current = await getUserProfile(uid)
  if (!current) throw new Error('PROFILE NOT FOUND')
  await updateDoc(doc(db, 'users', uid), {
    preferences: { ...current.preferences, ...preferences },
    updatedAt: serverTimestamp(),
  })
}

export async function findUserByPartnerCode(code: string): Promise<UserProfile | null> {
  const uid = await lookupPartnerCode(code)
  if (!uid) return null
  return getUserProfile(uid)
}

export async function updateProfileFields(
  uid: string,
  fields: Partial<
    Pick<UserProfile, 'displayName' | 'nickname' | 'spiderId' | 'suitId' | 'statusMessage' | 'friendIds'>
  >,
): Promise<void> {
  const db = requireDb()
  await updateDoc(doc(db, 'users', uid), {
    ...fields,
    updatedAt: serverTimestamp(),
  })
}

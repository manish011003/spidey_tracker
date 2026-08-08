import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import type {
  AdventureProgress,
  UserPreferences,
  UserProfile,
  UserRole,
  SpiderId,
  SuitId,
} from '../../types'
import { generatePartnerCode } from '../../utils/partnerCode'
import { requireDb } from './config'
import { lookupPartnerCode, registerPartnerCode } from './partnerCodes'
import { levelFromXp } from '../../utils/progression'

export function emptyAdventure(): AdventureProgress {
  return {
    xp: 0,
    level: 1,
    unlockedSuits: ['classic'],
    achievements: [],
    completedMissions: [],
    discoveries: [],
    missionProgress: {},
    quizStreak: 0,
    quizzesCompleted: 0,
    nudgesSent: 0,
  }
}

function mapAdventure(raw: unknown): AdventureProgress {
  const base = emptyAdventure()
  if (!raw || typeof raw !== 'object') return base
  const d = raw as Partial<AdventureProgress>
  const xp = Math.max(0, d.xp ?? 0)
  return {
    ...base,
    ...d,
    xp,
    level: levelFromXp(xp),
    unlockedSuits: Array.isArray(d.unlockedSuits) ? (d.unlockedSuits as SuitId[]) : ['classic'],
    achievements: Array.isArray(d.achievements) ? d.achievements : [],
    completedMissions: Array.isArray(d.completedMissions) ? d.completedMissions : [],
    discoveries: Array.isArray(d.discoveries) ? d.discoveries : [],
    missionProgress: d.missionProgress ?? {},
    quizStreak: d.quizStreak ?? 0,
    quizzesCompleted: d.quizzesCompleted ?? 0,
    nudgesSent: d.nudgesSent ?? 0,
  }
}

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
    incomingFriendRequests: Array.isArray(data.incomingFriendRequests)
      ? (data.incomingFriendRequests as string[])
      : [],
    outgoingFriendRequests: Array.isArray(data.outgoingFriendRequests)
      ? (data.outgoingFriendRequests as string[])
      : [],
    onboardingComplete: Boolean(data.onboardingComplete),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...(data.preferences as Partial<UserPreferences> | undefined),
      // Mute by default unless explicitly enabled
      soundEnabled: Boolean((data.preferences as Partial<UserPreferences> | undefined)?.soundEnabled),
    },
    adventure: mapAdventure(data.adventure),
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = requireDb()
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return mapUserDoc(uid, snap.data() as Record<string, unknown>)
}

/** Best-effort: never block login if the code index is flaky. */
async function ensurePartnerCodeIndex(uid: string, currentCode: string): Promise<string> {
  const code = currentCode || generatePartnerCode()
  try {
    await registerPartnerCode(code, uid)
    return code
  } catch (err) {
    console.warn('[users] partner code register failed, retrying', err)
  }

  for (let i = 0; i < 5; i++) {
    const next = generatePartnerCode()
    try {
      await registerPartnerCode(next, uid)
      if (next !== code) {
        const db = requireDb()
        await updateDoc(doc(db, 'users', uid), {
          partnerCode: next,
          updatedAt: serverTimestamp(),
        })
      }
      return next
    } catch (err) {
      console.warn('[users] partner code retry failed', err)
    }
  }

  // Login must still succeed — linking by code may fail until next session
  return code
}

export async function ensureUserShell(user: User): Promise<UserProfile> {
  const existing = await getUserProfile(user.uid)
  if (existing) {
    const code = await ensurePartnerCodeIndex(user.uid, existing.partnerCode)
    return code === existing.partnerCode ? existing : { ...existing, partnerCode: code }
  }

  const db = requireDb()
  const now = Date.now()
  const partnerCode = generatePartnerCode()

  const payload: Record<string, unknown> = {
    uid: user.uid,
    displayName: user.displayName?.trim() || 'Spider',
    email: user.email ?? '',
    role: 'boyfriend',
    spiderId: 'classic',
    suitId: 'classic',
    statusMessage: 'WEB SENSORS ONLINE',
    partnerId: null,
    partnerCode,
    relationshipId: null,
    friendIds: [],
    incomingFriendRequests: [],
    outgoingFriendRequests: [],
    onboardingComplete: false,
    preferences: { ...DEFAULT_PREFERENCES },
    adventure: emptyAdventure(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  if (user.photoURL) payload.photoURL = user.photoURL

  try {
    await setDoc(doc(db, 'users', user.uid), payload)
  } catch (err) {
    // Concurrent first login may have created the doc — load it
    const raced = await getUserProfile(user.uid)
    if (raced) {
      const code = await ensurePartnerCodeIndex(user.uid, raced.partnerCode)
      return code === raced.partnerCode ? raced : { ...raced, partnerCode: code }
    }
    console.error('[users] create shell failed', err)
    throw err
  }

  const claimed = await ensurePartnerCodeIndex(user.uid, partnerCode)

  return {
    uid: user.uid,
    displayName: (payload.displayName as string) || 'Spider',
    email: (payload.email as string) || '',
    ...(user.photoURL ? { photoURL: user.photoURL } : {}),
    role: 'boyfriend',
    spiderId: 'classic',
    suitId: 'classic',
    statusMessage: 'WEB SENSORS ONLINE',
    partnerId: null,
    partnerCode: claimed,
    relationshipId: null,
    friendIds: [],
    incomingFriendRequests: [],
    outgoingFriendRequests: [],
    onboardingComplete: false,
    createdAt: now,
    updatedAt: now,
    preferences: { ...DEFAULT_PREFERENCES },
    adventure: emptyAdventure(),
  }
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
  const starter = emptyAdventure()
  starter.xp = 20
  starter.level = levelFromXp(20)
  starter.achievements = ['first_web']
  const payload: Record<string, unknown> = {
    role: data.role,
    spiderId: data.spiderId,
    suitId: data.suitId,
    displayName: data.displayName,
    onboardingComplete: true,
    adventure: starter,
    incomingFriendRequests: [],
    outgoingFriendRequests: [],
    updatedAt: serverTimestamp(),
  }
  if (data.nickname) payload.nickname = data.nickname
  await updateDoc(doc(db, 'users', uid), payload)
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
  const cleaned: Record<string, unknown> = { updatedAt: serverTimestamp() }
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) cleaned[key] = value
  }
  await updateDoc(doc(db, 'users', uid), cleaned)
}

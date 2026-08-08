import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import type { AdventureProgress, SuitId } from '../../types'
import { requireDb } from './config'
import { emptyAdventure, getUserProfile } from './users'
import { levelFromXp, levelProgress, isSuitUnlocked } from '../../utils/progression'
import {
  getAchievement,
  MISSIONS,
  suitsUnlockedAtLevel as suitsFromLevel,
  type AchievementId,
} from '../../data/adventure'
import { playSound } from '../sound/audio'

export { emptyAdventure }

function unlockedSuitsFor(level: number, existing: SuitId[]): SuitId[] {
  const fromLevel = suitsFromLevel(level)
  return Array.from(new Set([...existing, ...fromLevel, 'classic' as SuitId]))
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function weekKey(): string {
  const d = new Date()
  const onejan = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${week}`
}

/** Normalize / roll daily-weekly mission windows */
export function normalizeAdventure(raw: Partial<AdventureProgress> | undefined): AdventureProgress {
  const base = { ...emptyAdventure(), ...raw }
  const daily = todayKey()
  const weekly = weekKey()
  let missionProgress = { ...(base.missionProgress ?? {}) }
  let completedMissions = [...(base.completedMissions ?? [])]

  if (base.dailyKey !== daily) {
    for (const m of MISSIONS.filter((x) => x.recurring === 'daily')) {
      delete missionProgress[m.id]
      completedMissions = completedMissions.filter((id) => id !== m.id)
    }
  }
  if (base.weeklyKey !== weekly) {
    for (const m of MISSIONS.filter((x) => x.recurring === 'weekly')) {
      delete missionProgress[m.id]
      completedMissions = completedMissions.filter((id) => id !== m.id)
    }
  }

  const xp = Math.max(0, base.xp ?? 0)
  const level = levelFromXp(xp)
  return {
    ...base,
    xp,
    level,
    unlockedSuits: unlockedSuitsFor(level, base.unlockedSuits ?? ['classic']),
    achievements: base.achievements ?? [],
    completedMissions,
    discoveries: base.discoveries ?? [],
    missionProgress,
    dailyKey: daily,
    weeklyKey: weekly,
    quizStreak: base.quizStreak ?? 0,
    quizzesCompleted: base.quizzesCompleted ?? 0,
    nudgesSent: base.nudgesSent ?? 0,
  }
}

async function saveAdventure(uid: string, adventure: AdventureProgress): Promise<AdventureProgress> {
  const db = requireDb()
  const normalized = normalizeAdventure(adventure)
  await updateDoc(doc(db, 'users', uid), {
    adventure: normalized,
    updatedAt: serverTimestamp(),
  })
  return normalized
}

export type AwardResult = {
  adventure: AdventureProgress
  xpGained: number
  leveledUp: boolean
  newAchievements: string[]
  newSuits: SuitId[]
}

export async function awardXp(
  uid: string,
  amount: number,
  opts?: { achievementIds?: AchievementId[]; missionId?: string },
): Promise<AwardResult> {
  const profile = await getUserProfile(uid)
  if (!profile) throw new Error('PROFILE NOT FOUND')

  let adv = normalizeAdventure(profile.adventure)
  const beforeLevel = adv.level
  const beforeSuits = new Set(adv.unlockedSuits)
  const newAchievements: string[] = []

  adv = { ...adv, xp: adv.xp + Math.max(0, amount) }
  adv.level = levelFromXp(adv.xp)
  adv.unlockedSuits = unlockedSuitsFor(adv.level, adv.unlockedSuits)

  if (opts?.missionId && !adv.completedMissions.includes(opts.missionId)) {
    adv.completedMissions = [...adv.completedMissions, opts.missionId]
  }

  for (const id of opts?.achievementIds ?? []) {
    if (!adv.achievements.includes(id)) {
      adv.achievements = [...adv.achievements, id]
      newAchievements.push(id)
      const def = getAchievement(id)
      if (def) {
        adv.xp += def.xp
        adv.level = levelFromXp(adv.xp)
        adv.unlockedSuits = unlockedSuitsFor(adv.level, adv.unlockedSuits)
      }
    }
  }

  // Auto achievements from state
  const autoCheck: Array<[AchievementId, boolean]> = [
    ['level_5', adv.level >= 5],
    ['level_10', adv.level >= 10],
    ['suit_collector', adv.unlockedSuits.length >= 4],
    ['explorer_1', adv.discoveries.length >= 1],
    ['explorer_5', adv.discoveries.length >= 5],
    ['quiz_streak_3', adv.quizStreak >= 3],
  ]
  for (const [id, ok] of autoCheck) {
    if (ok && !adv.achievements.includes(id)) {
      adv.achievements = [...adv.achievements, id]
      newAchievements.push(id)
      const def = getAchievement(id)
      if (def) {
        adv.xp += def.xp
        adv.level = levelFromXp(adv.xp)
        adv.unlockedSuits = unlockedSuitsFor(adv.level, adv.unlockedSuits)
      }
    }
  }

  const saved = await saveAdventure(uid, adv)
  const newSuits = saved.unlockedSuits.filter((s) => !beforeSuits.has(s))
  const leveledUp = saved.level > beforeLevel
  if (leveledUp) playSound('connect')
  else if (amount > 0) playSound('signal')

  return {
    adventure: saved,
    xpGained: amount,
    leveledUp,
    newAchievements,
    newSuits,
  }
}

export async function bumpMission(
  uid: string,
  missionId: string,
  by = 1,
): Promise<AwardResult | null> {
  const profile = await getUserProfile(uid)
  if (!profile) return null
  let adv = normalizeAdventure(profile.adventure)
  const mission = MISSIONS.find((m) => m.id === missionId)
  if (!mission) return null
  if (adv.completedMissions.includes(missionId)) return null

  const cur = (adv.missionProgress[missionId] ?? 0) + by
  adv.missionProgress = { ...adv.missionProgress, [missionId]: cur }
  await saveAdventure(uid, adv)

  if (cur >= mission.target) {
    const achievementIds: AchievementId[] = []
    if (mission.category === 'daily') achievementIds.push('mission_daily')
    return awardXp(uid, mission.xp, { missionId, achievementIds })
  }
  return null
}

export async function recordQuizResult(
  uid: string,
  correct: number,
  total: number,
): Promise<AwardResult> {
  const profile = await getUserProfile(uid)
  if (!profile) throw new Error('PROFILE NOT FOUND')
  let adv = normalizeAdventure(profile.adventure)
  const today = todayKey()
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  if (adv.lastQuizDate === today) {
    // still award XP but don't bump streak twice same day
  } else if (adv.lastQuizDate === yesterday) {
    adv.quizStreak += 1
  } else {
    adv.quizStreak = 1
  }
  adv.lastQuizDate = today
  adv.quizzesCompleted += 1
  await saveAdventure(uid, adv)

  let xp = correct * 25
  if (correct === total && total > 0) xp += 15
  const achievementIds: AchievementId[] = ['quiz_rookie']
  if (correct === total && total > 0) {
    await bumpMission(uid, 'quiz_master', 1)
  }
  await bumpMission(uid, 'daily_quiz', 1)
  await bumpMission(uid, 'weekly_quiz_3', 1)

  return awardXp(uid, xp, { achievementIds })
}

export async function recordDiscovery(uid: string, discoveryId: string, xp: number, unlockSuit?: SuitId) {
  const profile = await getUserProfile(uid)
  if (!profile) throw new Error('PROFILE NOT FOUND')
  let adv = normalizeAdventure(profile.adventure)
  if (adv.discoveries.includes(discoveryId)) {
    return { adventure: adv, xpGained: 0, leveledUp: false, newAchievements: [] as string[], newSuits: [] as SuitId[] }
  }
  adv.discoveries = [...adv.discoveries, discoveryId]
  if (unlockSuit && !adv.unlockedSuits.includes(unlockSuit)) {
    adv.unlockedSuits = [...adv.unlockedSuits, unlockSuit]
  }
  await saveAdventure(uid, adv)
  await bumpMission(uid, 'explore_park', 1)
  await bumpMission(uid, 'discovery_any', 1)
  return awardXp(uid, xp, { achievementIds: ['explorer_1'] })
}

export async function equipSuit(uid: string, suitId: SuitId): Promise<void> {
  const profile = await getUserProfile(uid)
  if (!profile) throw new Error('PROFILE NOT FOUND')
  const adv = normalizeAdventure(profile.adventure)
  if (!isSuitUnlocked(suitId, adv.level, adv.unlockedSuits)) {
    throw new Error('SUIT LOCKED — LEVEL UP OR COMPLETE MISSIONS')
  }
  const db = requireDb()
  await updateDoc(doc(db, 'users', uid), {
    suitId,
    updatedAt: serverTimestamp(),
  })
}

export async function grantAchievement(uid: string, id: AchievementId): Promise<AwardResult | null> {
  const profile = await getUserProfile(uid)
  if (!profile) return null
  const adv = normalizeAdventure(profile.adventure)
  if (adv.achievements.includes(id)) return null
  return awardXp(uid, 0, { achievementIds: [id] })
}

export { levelProgress, isSuitUnlocked }

import type { SuitId } from '../types'

/** XP required to go from level L → L+1. Total XP for level N is sum of thresholds. */
export function xpForLevel(level: number): number {
  return Math.round(80 + level * 45 + Math.pow(level, 1.35) * 12)
}

export function totalXpForLevel(level: number): number {
  let total = 0
  for (let l = 1; l < level; l++) total += xpForLevel(l)
  return total
}

export function levelFromXp(xp: number): number {
  let level = 1
  let remaining = Math.max(0, xp)
  while (remaining >= xpForLevel(level) && level < 99) {
    remaining -= xpForLevel(level)
    level++
  }
  return level
}

/** Progress within current level 0..1 */
export function levelProgress(xp: number): { level: number; into: number; need: number; ratio: number } {
  const level = levelFromXp(xp)
  const base = totalXpForLevel(level)
  const into = Math.max(0, xp - base)
  const need = xpForLevel(level)
  return { level, into, need, ratio: Math.min(1, into / need) }
}

/** Minimum level to equip each suit (classic always free). */
export const SUIT_UNLOCK_LEVEL: Partial<Record<SuitId, number>> = {
  classic: 1,
  black: 2,
  scarlet: 3,
  stealth: 4,
  noir: 5,
  iron: 6,
  future: 7,
  neon: 8,
  america: 10,
  ghost: 12,
}

export function isSuitUnlocked(suitId: SuitId, level: number, unlockedSuits: SuitId[]): boolean {
  if (unlockedSuits.includes(suitId)) return true
  const need = SUIT_UNLOCK_LEVEL[suitId] ?? 99
  return level >= need
}

export const XP_REWARDS = {
  quizCorrect: 25,
  quizPerfect: 15,
  dailyMission: 40,
  weeklyMission: 100,
  explorationMission: 60,
  socialMission: 50,
  discovery: 80,
  achievement: 35,
  easterEgg: 50,
  firstFriend: 30,
  nudge: 5,
} as const

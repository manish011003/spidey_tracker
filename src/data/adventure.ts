import type { SuitId } from '../types'
import { SUIT_UNLOCK_LEVEL } from '../utils/progression'

export type AchievementId =
  | 'first_web'
  | 'linked_partner'
  | 'friend_circle'
  | 'quiz_rookie'
  | 'quiz_streak_3'
  | 'mission_daily'
  | 'explorer_1'
  | 'explorer_5'
  | 'level_5'
  | 'level_10'
  | 'suit_collector'
  | 'night_owl'

export type AchievementDef = {
  id: AchievementId
  name: string
  description: string
  xp: number
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_web', name: 'FIRST WEB', description: 'Complete spider setup.', xp: 20 },
  { id: 'linked_partner', name: 'DOUBLE SIGNAL', description: 'Link your partner.', xp: 40 },
  { id: 'friend_circle', name: 'WEB CIRCLE', description: 'Add your first friend.', xp: 30 },
  { id: 'quiz_rookie', name: 'QUIZ ROOKIE', description: 'Finish a quiz.', xp: 25 },
  { id: 'quiz_streak_3', name: 'HOT STREAK', description: '3-day quiz streak.', xp: 50 },
  { id: 'mission_daily', name: 'DAILY WEB', description: 'Clear a daily mission.', xp: 30 },
  { id: 'explorer_1', name: 'FIRST FIND', description: 'Discover 1 Easter egg.', xp: 40 },
  { id: 'explorer_5', name: 'CITY CRAWLER', description: 'Discover 5 Easter eggs.', xp: 120 },
  { id: 'level_5', name: 'STREET HERO', description: 'Reach level 5.', xp: 35 },
  { id: 'level_10', name: 'CITY LEGEND', description: 'Reach level 10.', xp: 80 },
  { id: 'suit_collector', name: 'WARDROBE', description: 'Unlock 4 suits.', xp: 45 },
  { id: 'night_owl', name: 'NIGHT OWL', description: 'Open the tracker after midnight.', xp: 15 },
]

export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

export type MissionCategory = 'daily' | 'weekly' | 'exploration' | 'social' | 'quiz' | 'discovery'

export type MissionDef = {
  id: string
  title: string
  description: string
  category: MissionCategory
  target: number
  xp: number
  /** Resets daily/weekly via progress key date */
  recurring?: 'daily' | 'weekly'
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'daily_quiz',
    title: 'DAILY QUIZ',
    description: 'Complete 1 quiz today.',
    category: 'daily',
    target: 1,
    xp: 40,
    recurring: 'daily',
  },
  {
    id: 'daily_nudge',
    title: 'TAP THE WEB',
    description: 'Send a nudge to a spider.',
    category: 'daily',
    target: 1,
    xp: 25,
    recurring: 'daily',
  },
  {
    id: 'daily_share',
    title: 'BEACON ON',
    description: 'Share your location for 5 minutes.',
    category: 'daily',
    target: 1,
    xp: 30,
    recurring: 'daily',
  },
  {
    id: 'weekly_friends',
    title: 'EXPAND THE WEB',
    description: 'Add or accept 1 friend this week.',
    category: 'weekly',
    target: 1,
    xp: 100,
    recurring: 'weekly',
  },
  {
    id: 'weekly_quiz_3',
    title: 'BRAIN WEB',
    description: 'Finish 3 quizzes this week.',
    category: 'weekly',
    target: 3,
    xp: 90,
    recurring: 'weekly',
  },
  {
    id: 'explore_park',
    title: 'PARK PATROL',
    description: 'Claim a park signal near your location.',
    category: 'exploration',
    target: 1,
    xp: 60,
  },
  {
    id: 'social_nudge_3',
    title: 'SPIDER SENSE PING',
    description: 'Nudge friends/partner 3 times.',
    category: 'social',
    target: 3,
    xp: 50,
  },
  {
    id: 'quiz_master',
    title: 'TRUE BELIEVER',
    description: 'Score 100% on a quiz.',
    category: 'quiz',
    target: 1,
    xp: 55,
  },
  {
    id: 'discovery_any',
    title: 'CLUE SEEKER',
    description: 'Claim any nearby landmark quest.',
    category: 'discovery',
    target: 1,
    xp: 70,
  },
  {
    id: 'explore_nearby_3',
    title: 'SECTOR SWEEP',
    description: 'Claim 3 landmarks in your current sector.',
    category: 'exploration',
    target: 3,
    xp: 110,
  },
]

export type QuizQuestion = {
  id: string
  prompt: string
  choices: string[]
  correctIndex: number
}

export type QuizDef = {
  id: string
  title: string
  questions: QuizQuestion[]
}

export const QUIZZES: QuizDef[] = [
  {
    id: 'spidey_basics',
    title: 'SPIDER BASICS',
    questions: [
      {
        id: 'q1',
        prompt: 'What city does Spider-Man usually protect?',
        choices: ['Gotham', 'New York', 'Metropolis', 'Central City'],
        correctIndex: 1,
      },
      {
        id: 'q2',
        prompt: 'Peter Parker’s uncle who inspired him?',
        choices: ['Uncle Ben', 'Uncle Aaron', 'Uncle Tony', 'Uncle May'],
        correctIndex: 0,
      },
      {
        id: 'q3',
        prompt: 'Classic suit colors?',
        choices: ['Black & gold', 'Red & blue', 'Green & purple', 'White & pink'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'web_tech',
    title: 'WEB TECH',
    questions: [
      {
        id: 'q1',
        prompt: 'What shoots from Spidey’s wrists?',
        choices: ['Laser', 'Web fluid', 'Ice', 'Smoke'],
        correctIndex: 1,
      },
      {
        id: 'q2',
        prompt: 'Spider-sense warns of…',
        choices: ['Rain', 'Danger', 'Homework', 'Traffic only'],
        correctIndex: 1,
      },
      {
        id: 'q3',
        prompt: 'Symbiote suit is usually…',
        choices: ['White', 'Black', 'Orange', 'Silver'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'multiverse',
    title: 'MULTIVERSE',
    questions: [
      {
        id: 'q1',
        prompt: 'Spider-Noir is from which vibe?',
        choices: ['Space opera', '1930s noir', 'Western', 'Cyberpunk only'],
        correctIndex: 1,
      },
      {
        id: 'q2',
        prompt: 'Miles Morales is known for…',
        choices: ['Venom blast', 'Ice powers', 'Flight only', 'Magic rings'],
        correctIndex: 0,
      },
      {
        id: 'q3',
        prompt: 'Ghost-Spider often wears…',
        choices: ['All black', 'White hoodie suit', 'Armor only', 'No mask'],
        correctIndex: 1,
      },
    ],
  },
]

export function pickRandomQuiz(excludeId?: string): QuizDef {
  const pool = excludeId ? QUIZZES.filter((q) => q.id !== excludeId) : QUIZZES
  return pool[Math.floor(Math.random() * pool.length)] ?? QUIZZES[0]
}

export type DiscoveryCategory = 'temple' | 'mall' | 'landmark' | 'cafe' | 'park' | 'other'

export type DiscoveryDef = {
  id: string
  name: string
  clue: string
  category: DiscoveryCategory
  /** Approximate public coords — discovery radius in meters */
  latitude: number
  longitude: number
  radiusM: number
  xp: number
  unlockSuit?: SuitId
}

/**
 * Seeded public-place discoveries (examples). Users must physically enter the radius.
 * Expand over time; privacy-safe — no private homes.
 */
export const DISCOVERIES: DiscoveryDef[] = [
  {
    id: 'india_gate',
    name: 'INDIA GATE WEB',
    clue: 'Where the war memorial arches under Delhi’s sky…',
    category: 'landmark',
    latitude: 28.6129,
    longitude: 77.2295,
    radiusM: 180,
    xp: 80,
  },
  {
    id: 'gateway_india',
    name: 'GATEWAY ARCH',
    clue: 'An ocean-facing stone gate in Mumbai watches the harbor…',
    category: 'landmark',
    latitude: 18.922,
    longitude: 72.8347,
    radiusM: 160,
    xp: 80,
  },
  {
    id: 'lotus_temple',
    name: 'LOTUS SIGNAL',
    clue: 'A blooming concrete flower of faith in Delhi…',
    category: 'temple',
    latitude: 28.5535,
    longitude: 77.2588,
    radiusM: 200,
    xp: 90,
  },
  {
    id: 'central_park_nyc',
    name: 'CENTRAL PARK WEB',
    clue: 'A vast green rectangle in the middle of Manhattan…',
    category: 'park',
    latitude: 40.7829,
    longitude: -73.9654,
    radiusM: 250,
    xp: 85,
  },
  {
    id: 'times_square',
    name: 'NEON CROSSROADS',
    clue: 'Billboards scream louder than traffic in NYC…',
    category: 'landmark',
    latitude: 40.758,
    longitude: -73.9855,
    radiusM: 150,
    xp: 75,
    unlockSuit: 'neon',
  },
  {
    id: 'london_eye',
    name: 'RIVER WHEEL',
    clue: 'A giant wheel turns beside the Thames…',
    category: 'landmark',
    latitude: 51.5033,
    longitude: -0.1195,
    radiusM: 160,
    xp: 80,
  },
  {
    id: 'shibuya',
    name: 'CROSSING SWARM',
    clue: 'Tokyo’s busiest scramble — follow the crowd pulse…',
    category: 'landmark',
    latitude: 35.6595,
    longitude: 139.7004,
    radiusM: 140,
    xp: 85,
  },
  {
    id: 'cafe_generic_hint',
    name: 'CORNER CAFE CLUE',
    clue: 'Any busy public cafe plaza near a city center counts — stand still and open Discover.',
    category: 'cafe',
    latitude: 28.6315,
    longitude: 77.2167,
    radiusM: 220,
    xp: 50,
  },
]

export function getDiscovery(id: string): DiscoveryDef | undefined {
  return DISCOVERIES.find((d) => d.id === id)
}

export function suitsUnlockedAtLevel(level: number): SuitId[] {
  return (Object.entries(SUIT_UNLOCK_LEVEL) as [SuitId, number][])
    .filter(([, need]) => level >= need)
    .map(([id]) => id)
}

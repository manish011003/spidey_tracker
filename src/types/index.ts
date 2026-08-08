export type UserRole = 'boyfriend' | 'girlfriend' | 'friend'

export type SpiderId =
  | 'classic'
  | 'black'
  | 'scarlet'
  | 'noir'
  | 'iron'
  | 'future'
  | 'neon'
  | 'mystery'

export type SuitId =
  | 'classic'
  | 'black'
  | 'scarlet'
  | 'noir'
  | 'iron'
  | 'stealth'
  | 'neon'
  | 'america'
  | 'future'
  | 'ghost'
  | 'mystery' // legacy alias → treated as ghost

export type EventIcon =
  | 'heart'
  | 'home'
  | 'star'
  | 'travel'
  | 'birthday'
  | 'cafe'
  | 'custom'
  | 'spider'

export type PresenceStatus = 'online' | 'fading' | 'offline'

export interface UserPreferences {
  soundEnabled: boolean
  reduceMotion: boolean
  skipBootAnimation: boolean
  locationSharingEnabled: boolean
  preciseLocationEnabled: boolean
}

export interface UserProfile {
  uid: string
  displayName: string
  nickname?: string
  email: string
  photoURL?: string
  role: UserRole
  spiderId: SpiderId
  suitId: SuitId
  /** Short hover / status line shown on avatar */
  statusMessage?: string
  partnerId: string | null
  partnerCode: string
  relationshipId: string | null
  /** Additional spiders beyond the romantic partner link */
  friendIds: string[]
  onboardingComplete: boolean
  createdAt: number
  updatedAt: number
  preferences: UserPreferences
}

export interface Relationship {
  id: string
  memberIds: [string, string]
  createdAt: number
  status: 'active' | 'unlinked'
}

export interface SharedEvent {
  id: string
  title: string
  description: string
  latitude: number
  longitude: number
  locationName: string
  date: string
  icon: EventIcon
  color?: string
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface PresenceData {
  online: boolean
  lastSeen: number
  locationSharingEnabled: boolean
  preciseLocationEnabled: boolean
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  heading: number | null
  speed: number | null
  timestamp: number | null
}

export interface SpiderDefinition {
  id: SpiderId
  name: string
  description: string
  primaryColor: string
  secondaryColor: string
  locked?: boolean
}

export interface SuitDefinition {
  id: SuitId
  name: string
  description: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  primaryColor: string
  secondaryColor: string
  accentColor: string
}

export interface GeocodeResult {
  displayName: string
  latitude: number
  longitude: number
  city?: string
  country?: string
}

export interface AppError {
  code: string
  message: string
}

import type { SpiderId, SuitId, UserRole } from '../types'

/** Role-based default Spidey identity for onboarding. */
export function defaultIdentityForRole(role: UserRole): {
  spiderId: SpiderId
  suitId: SuitId
} {
  if (role === 'girlfriend') {
    return { spiderId: 'classic', suitId: 'ghost' }
  }
  if (role === 'friend') {
    return { spiderId: 'classic', suitId: 'black' }
  }
  return { spiderId: 'classic', suitId: 'classic' }
}

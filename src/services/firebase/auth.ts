import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { isFirebaseConfigured, requireAuth } from './config'

const provider = new GoogleAuthProvider()
provider.setCustomParameters({ prompt: 'select_account' })

export const AUTH_REDIRECT_PENDING_KEY = 'spidey_auth_redirect_pending'

export function markRedirectPending(): void {
  try {
    sessionStorage.setItem(AUTH_REDIRECT_PENDING_KEY, '1')
  } catch {
    /* private mode */
  }
}

export function clearRedirectPending(): void {
  try {
    sessionStorage.removeItem(AUTH_REDIRECT_PENDING_KEY)
  } catch {
    /* private mode */
  }
}

export function isRedirectPending(): boolean {
  try {
    return sessionStorage.getItem(AUTH_REDIRECT_PENDING_KEY) === '1'
  } catch {
    return false
  }
}

export function isMobileAuthClient(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return true
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true
  try {
    if (window.self !== window.top) return true
  } catch {
    return true
  }
  return false
}

function authCode(error: unknown): string | undefined {
  return (error as { code?: string })?.code
}

function authMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error ?? '')
}

function mapAuthError(error: unknown): Error {
  const code = authCode(error)
  const msg = authMessage(error)

  if (code === 'auth/network-request-failed') {
    return new Error('WEB CONNECTION INTERRUPTED')
  }
  if (code === 'auth/operation-not-allowed') {
    return new Error('GOOGLE SIGN-IN NOT ENABLED IN FIREBASE')
  }
  if (code === 'auth/unauthorized-domain') {
    return new Error('DOMAIN NOT AUTHORIZED IN FIREBASE AUTH SETTINGS')
  }
  if (code === 'auth/configuration-not-found') {
    return new Error('FIREBASE AUTH NOT SET UP FOR THIS APP')
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return new Error('SIGN-IN CANCELLED — TAP AGAIN')
  }
  // Firebase IndexedDB race (common after popup/redirect on Chrome/Safari)
  if (
    msg.includes('Database is closing') ||
    msg.includes('Data base is closing') ||
    msg.includes('closing/hidden')
  ) {
    return new Error('SIGN-IN GLITCH — TAP SIGN IN AGAIN')
  }
  if (
    code === 'auth/access-denied' ||
    msg.includes('access_denied') ||
    msg.includes('Access blocked') ||
    msg.includes('has not completed the Google verification')
  ) {
    return new Error('GOOGLE BLOCKED SIGN-IN — ADD USER AS TEST USER OR PUBLISH OAUTH APP')
  }
  return new Error(
    code ? `IDENTITY VERIFICATION FAILED (${code})` : 'IDENTITY VERIFICATION FAILED',
  )
}

function isIndexedDbRace(error: unknown): boolean {
  const msg = authMessage(error)
  return (
    msg.includes('Database is closing') ||
    msg.includes('Data base is closing') ||
    msg.includes('closing/hidden')
  )
}

async function startRedirect(): Promise<never> {
  const auth = requireAuth()
  markRedirectPending()
  await signInWithRedirect(auth, provider)
  throw new Error('REDIRECT_STARTED')
}

/**
 * Prefer popup (session stays on this origin).
 * Mobile / blocked popups fall back to redirect via firebaseapp.com auth handler.
 */
export async function signInWithGoogle(): Promise<User> {
  const auth = requireAuth()

  try {
    const result = await signInWithPopup(auth, provider)
    clearRedirectPending()
    return result.user
  } catch (error: unknown) {
    const code = authCode(error)

    if (isIndexedDbRace(error)) {
      if (auth.currentUser) {
        clearRedirectPending()
        return auth.currentUser
      }
      console.warn('[auth] popup IndexedDB race — falling back to redirect', error)
      return startRedirect()
    }

    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw mapAuthError(error)
    }

    if (
      isMobileAuthClient() ||
      code === 'auth/popup-blocked' ||
      code === 'auth/internal-error' ||
      authMessage(error).includes('Cross-Origin-Opener-Policy') ||
      authMessage(error).includes('policy would block')
    ) {
      console.warn('[auth] popup unavailable — redirect', code, error)
      return startRedirect()
    }

    console.error('[auth] Google sign-in failed:', code, error)
    throw mapAuthError(error)
  }
}

export async function handleRedirectResult(): Promise<User | null> {
  if (!isFirebaseConfigured) return null
  const auth = requireAuth()

  try {
    const result = await getRedirectResult(auth)
    if (result?.user) {
      clearRedirectPending()
      return result.user
    }
    return null
  } catch (error: unknown) {
    const code = authCode(error)
    if (isIndexedDbRace(error)) {
      console.warn('[auth] redirect IDB race — waiting onAuthStateChanged')
      return null
    }
    if (code === 'auth/unauthorized-domain') {
      clearRedirectPending()
      throw new Error('DOMAIN NOT AUTHORIZED IN FIREBASE AUTH SETTINGS')
    }
    console.warn('[auth] getRedirectResult:', code, error)
    return null
  }
}

export async function signOut(): Promise<void> {
  const auth = requireAuth()
  clearRedirectPending()
  await firebaseSignOut(auth)
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured) {
    callback(null)
    return () => undefined
  }
  const auth = requireAuth()
  return onAuthStateChanged(auth, callback)
}

export function hardResetToLogin(): void {
  clearRedirectPending()
  const url = `${window.location.origin}/?signedOut=${Date.now()}`
  window.location.replace(url)
}

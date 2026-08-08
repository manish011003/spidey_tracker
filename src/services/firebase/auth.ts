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

/** Survives the Google redirect round-trip on mobile. */
export const AUTH_REDIRECT_PENDING_KEY = 'spidey_auth_redirect_pending'
export const AUTH_REDIRECT_AT_KEY = 'spidey_auth_redirect_at'

export function markRedirectPending(): void {
  try {
    sessionStorage.setItem(AUTH_REDIRECT_PENDING_KEY, '1')
    sessionStorage.setItem(AUTH_REDIRECT_AT_KEY, String(Date.now()))
  } catch {
    /* private mode */
  }
}

export function clearRedirectPending(): void {
  try {
    sessionStorage.removeItem(AUTH_REDIRECT_PENDING_KEY)
    sessionStorage.removeItem(AUTH_REDIRECT_AT_KEY)
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
  // iPadOS 13+ desktop UA
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

/** Only fall back to redirect for hard popup failures — not user cancel. */
function shouldUseRedirectFallback(error: unknown): boolean {
  const code = authCode(error)
  const msg = authMessage(error)
  if (
    code === 'auth/popup-blocked' ||
    code === 'auth/internal-error' ||
    code === 'auth/operation-not-supported-in-this-environment'
  ) {
    return true
  }
  if (
    msg.includes('Cross-Origin-Opener-Policy') ||
    msg.includes('policy would block') ||
    msg.includes('Database is closing') ||
    msg.includes('closing/hidden')
  ) {
    return true
  }
  return false
}

async function startRedirect(): Promise<never> {
  const auth = requireAuth()
  markRedirectPending()
  await signInWithRedirect(auth, provider)
  throw new Error('REDIRECT_STARTED')
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
    return new Error('SIGN-IN CANCELLED — TRY AGAIN')
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

export async function signInWithGoogle(): Promise<User> {
  const auth = requireAuth()

  // Mobile: redirect (popup unreliable). Desktop: popup first.
  if (isMobileAuthClient()) {
    return startRedirect()
  }

  try {
    const result = await signInWithPopup(auth, provider)
    clearRedirectPending()
    return result.user
  } catch (error: unknown) {
    if (shouldUseRedirectFallback(error)) {
      console.warn('[auth] popup failed — falling back to redirect', authCode(error), error)
      return startRedirect()
    }
    console.error('[auth] Google sign-in failed:', authCode(error), error)
    throw mapAuthError(error)
  }
}

/**
 * Must run once on cold start before other auth work.
 * Retries briefly — iOS often races IndexedDB right after returning from Google.
 */
export async function handleRedirectResult(): Promise<User | null> {
  if (!isFirebaseConfigured) return null
  const auth = requireAuth()
  const pending = isRedirectPending()

  const attempt = async (): Promise<User | null> => {
    const result = await getRedirectResult(auth)
    if (result?.user) {
      clearRedirectPending()
      return result.user
    }
    return null
  }

  try {
    const first = await attempt()
    if (first) return first

    // Mobile Safari: first getRedirectResult often null / throws while IDB settles
    if (pending) {
      for (let i = 0; i < 3; i++) {
        await new Promise((r) => setTimeout(r, 350 + i * 200))
        try {
          const again = await attempt()
          if (again) return again
        } catch (error: unknown) {
          const msg = authMessage(error)
          if (msg.includes('Database is closing') || msg.includes('closing/hidden')) {
            console.warn('[auth] redirect IDB race, retry', i)
            continue
          }
          throw error
        }
      }
    }
    return null
  } catch (error: unknown) {
    const code = authCode(error)
    const msg = authMessage(error)
    if (msg.includes('Database is closing') || msg.includes('closing/hidden')) {
      console.warn('[auth] redirect result IndexedDB race — relying on onAuthStateChanged')
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

/** Hard navigation after logout — clears sticky mobile SPA/auth state. */
export function hardResetToLogin(): void {
  clearRedirectPending()
  const url = `${window.location.origin}/?signedOut=${Date.now()}`
  window.location.replace(url)
}

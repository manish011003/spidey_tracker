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

function authCode(error: unknown): string | undefined {
  return (error as { code?: string })?.code
}

function authMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error ?? '')
}

/** Popup auth breaks under COOP / mobile / iframe — use full-page redirect instead. */
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
  // COOP / IndexedDB glitches often arrive with undefined code
  if (
    msg.includes('Cross-Origin-Opener-Policy') ||
    msg.includes('Database is closing') ||
    msg.includes('closing/hidden') ||
    msg.includes('policy would block')
  ) {
    return true
  }
  // Popup closed abruptly is often COOP cutting the opener link
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return true
  }
  if (!code && msg) return true
  return false
}

function preferRedirectFirst(): boolean {
  if (typeof window === 'undefined') return true
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true
  // Embedded preview / iframe
  try {
    if (window.self !== window.top) return true
  } catch {
    return true
  }
  return false
}

async function startRedirect(): Promise<never> {
  const auth = requireAuth()
  await signInWithRedirect(auth, provider)
  throw new Error('REDIRECT_STARTED')
}

export async function signInWithGoogle(): Promise<User> {
  const auth = requireAuth()

  if (preferRedirectFirst()) {
    return startRedirect()
  }

  try {
    const result = await signInWithPopup(auth, provider)
    return result.user
  } catch (error: unknown) {
    const code = authCode(error)

    if (code === 'auth/network-request-failed') {
      throw new Error('WEB CONNECTION INTERRUPTED')
    }
    if (code === 'auth/operation-not-allowed') {
      throw new Error('GOOGLE SIGN-IN NOT ENABLED IN FIREBASE')
    }
    if (code === 'auth/unauthorized-domain') {
      throw new Error('DOMAIN NOT AUTHORIZED IN FIREBASE AUTH SETTINGS')
    }
    if (code === 'auth/configuration-not-found') {
      throw new Error('FIREBASE AUTH NOT SET UP FOR THIS APP')
    }
    // OAuth consent screen in Testing mode blocks accounts not on the test-user list
    if (
      code === 'auth/access-denied' ||
      msg.includes('access_denied') ||
      msg.includes('Access blocked') ||
      msg.includes('has not completed the Google verification')
    ) {
      throw new Error('GOOGLE BLOCKED SIGN-IN — ADD USER AS TEST USER OR PUBLISH OAUTH APP')
    }

    if (shouldUseRedirectFallback(error)) {
      console.warn('[auth] popup failed — falling back to redirect', code, error)
      return startRedirect()
    }

    console.error('[auth] Google sign-in failed:', code, error)
    throw new Error(
      code ? `IDENTITY VERIFICATION FAILED (${code})` : 'IDENTITY VERIFICATION FAILED',
    )
  }
}

export async function handleRedirectResult(): Promise<User | null> {
  if (!isFirebaseConfigured) return null
  const auth = requireAuth()
  try {
    const result = await getRedirectResult(auth)
    return result?.user ?? null
  } catch (error: unknown) {
    const code = authCode(error)
    // IndexedDB race after redirect — auth state listener usually still recovers
    if (
      authMessage(error).includes('Database is closing') ||
      authMessage(error).includes('closing/hidden')
    ) {
      console.warn('[auth] redirect result IndexedDB race — relying on onAuthStateChanged')
      return null
    }
    if (code === 'auth/unauthorized-domain') {
      throw new Error('DOMAIN NOT AUTHORIZED IN FIREBASE')
    }
    console.warn('[auth] getRedirectResult:', code, error)
    return null
  }
}

export async function signOut(): Promise<void> {
  const auth = requireAuth()
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

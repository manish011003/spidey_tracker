import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  type User,
} from 'firebase/auth'
import { isFirebaseConfigured, requireAuth } from './config'

const provider = new GoogleAuthProvider()
provider.setCustomParameters({ prompt: 'select_account' })

let persistenceReady: Promise<void> | null = null

function ensurePersistence(): Promise<void> {
  if (!persistenceReady) {
    persistenceReady = setPersistence(requireAuth(), browserLocalPersistence).catch((err) => {
      console.warn('[auth] setPersistence failed', err)
    })
  }
  return persistenceReady
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

function preferRedirectFirst(): boolean {
  if (typeof window === 'undefined') return true
  const ua = navigator.userAgent
  // Mobile browsers often break popups; desktop popup is more reliable after logout
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true
  try {
    if (window.self !== window.top) return true
  } catch {
    return true
  }
  return false
}

async function startRedirect(): Promise<never> {
  const auth = requireAuth()
  await ensurePersistence()
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
  await ensurePersistence()

  if (preferRedirectFirst()) {
    return startRedirect()
  }

  try {
    const result = await signInWithPopup(auth, provider)
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

export async function handleRedirectResult(): Promise<User | null> {
  if (!isFirebaseConfigured) return null
  const auth = requireAuth()
  await ensurePersistence()
  try {
    const result = await getRedirectResult(auth)
    return result?.user ?? null
  } catch (error: unknown) {
    const code = authCode(error)
    if (
      authMessage(error).includes('Database is closing') ||
      authMessage(error).includes('closing/hidden')
    ) {
      console.warn('[auth] redirect result IndexedDB race — relying on onAuthStateChanged')
      return null
    }
    if (code === 'auth/unauthorized-domain') {
      throw new Error('DOMAIN NOT AUTHORIZED IN FIREBASE AUTH SETTINGS')
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

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

export async function signInWithGoogle(): Promise<User> {
  const auth = requireAuth()
  try {
    const result = await signInWithPopup(auth, provider)
    return result.user
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request'
    ) {
      if (code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, provider)
        throw new Error('REDIRECT_STARTED')
      }
      throw new Error('IDENTITY VERIFICATION CANCELLED')
    }
    if (code === 'auth/network-request-failed') {
      throw new Error('WEB CONNECTION INTERRUPTED')
    }
    if (code === 'auth/operation-not-allowed') {
      throw new Error('GOOGLE SIGN-IN NOT ENABLED IN FIREBASE')
    }
    if (code === 'auth/unauthorized-domain') {
      throw new Error('LOCALHOST NOT AUTHORIZED IN FIREBASE')
    }
    if (code === 'auth/configuration-not-found') {
      throw new Error('FIREBASE AUTH NOT SET UP FOR THIS APP')
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
  const result = await getRedirectResult(auth)
  return result?.user ?? null
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

import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPopup,
  signInWithRedirect,
  signInWithPhoneNumber,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type ConfirmationResult,
  type User,
} from 'firebase/auth'
import { isFirebaseConfigured, requireAuth } from './config'

const RECAPTCHA_CONTAINER_ID = 'spidey-recaptcha'

let phoneConfirmation: ConfirmationResult | null = null
let phoneRecaptcha: RecaptchaVerifier | null = null

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
    return new Error('SIGN-IN METHOD NOT ENABLED IN FIREBASE')
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
  if (code === 'auth/invalid-phone-number') {
    return new Error('INVALID PHONE — USE +COUNTRYCODE NUMBER')
  }
  if (code === 'auth/missing-phone-number') {
    return new Error('ENTER PHONE NUMBER')
  }
  if (code === 'auth/too-many-requests') {
    return new Error('TOO MANY SMS ATTEMPTS — WAIT AND RETRY')
  }
  if (code === 'auth/invalid-verification-code') {
    return new Error('WRONG CODE — CHECK SMS AND RETRY')
  }
  if (code === 'auth/code-expired' || code === 'auth/session-expired') {
    return new Error('CODE EXPIRED — REQUEST A NEW ONE')
  }
  if (code === 'auth/captcha-check-failed' || code === 'auth/invalid-app-credential') {
    return new Error('RECAPTCHA FAILED — REFRESH AND RETRY')
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

/** Normalize to E.164. Bare 10-digit numbers default to +91. */
export function normalizePhoneNumber(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  let digits = trimmed.replace(/[^\d+]/g, '')
  if (digits.startsWith('00')) digits = `+${digits.slice(2)}`
  if (digits.startsWith('+')) return digits
  const only = digits.replace(/\D/g, '')
  if (only.length === 10) return `+91${only}`
  if (only.length > 10) return `+${only}`
  return only ? `+${only}` : ''
}

function clearPhoneRecaptcha(): void {
  if (phoneRecaptcha) {
    try {
      phoneRecaptcha.clear()
    } catch {
      /* already cleared */
    }
    phoneRecaptcha = null
  }
  const el = document.getElementById(RECAPTCHA_CONTAINER_ID)
  if (el) el.innerHTML = ''
}

export function resetPhoneSignIn(): void {
  phoneConfirmation = null
  clearPhoneRecaptcha()
}

function ensureRecaptchaVerifier(): RecaptchaVerifier {
  const auth = requireAuth()
  clearPhoneRecaptcha()
  let host = document.getElementById(RECAPTCHA_CONTAINER_ID)
  if (!host) {
    host = document.createElement('div')
    host.id = RECAPTCHA_CONTAINER_ID
    host.style.display = 'none'
    document.body.appendChild(host)
  }
  phoneRecaptcha = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
    size: 'invisible',
  })
  return phoneRecaptcha
}

/** Send SMS OTP. Requires Phone provider enabled in Firebase Console. */
export async function sendPhoneVerificationCode(phoneInput: string): Promise<string> {
  const phone = normalizePhoneNumber(phoneInput)
  if (!phone || phone.length < 8) {
    throw new Error('ENTER PHONE WITH COUNTRY CODE (+91…)')
  }
  const auth = requireAuth()
  try {
    const verifier = ensureRecaptchaVerifier()
    phoneConfirmation = await signInWithPhoneNumber(auth, phone, verifier)
    return phone
  } catch (error: unknown) {
    resetPhoneSignIn()
    console.error('[auth] phone send failed', authCode(error), error)
    throw mapAuthError(error)
  }
}

/** Confirm SMS code and complete sign-in. */
export async function confirmPhoneVerificationCode(code: string): Promise<User> {
  const trimmed = code.replace(/\s/g, '')
  if (!/^\d{6}$/.test(trimmed)) {
    throw new Error('ENTER THE 6-DIGIT SMS CODE')
  }
  if (!phoneConfirmation) {
    throw new Error('REQUEST A CODE FIRST')
  }
  try {
    const result = await phoneConfirmation.confirm(trimmed)
    resetPhoneSignIn()
    clearRedirectPending()
    return result.user
  } catch (error: unknown) {
    console.error('[auth] phone confirm failed', authCode(error), error)
    throw mapAuthError(error)
  }
}

export function isPhoneCodePending(): boolean {
  return phoneConfirmation != null
}

async function startRedirect(): Promise<never> {
  const auth = requireAuth()
  markRedirectPending()
  await signInWithRedirect(auth, provider)
  throw new Error('REDIRECT_STARTED')
}

/**
 * Mobile: full-page redirect (same-origin authDomain via Vercel /__/auth proxy).
 * Desktop: popup first, redirect if popup is blocked.
 */
export async function signInWithGoogle(): Promise<User> {
  const auth = requireAuth()

  if (isMobileAuthClient()) {
    return startRedirect()
  }

  try {
    const result = await signInWithPopup(auth, provider)
    clearRedirectPending()
    return result.user
  } catch (error: unknown) {
    const code = authCode(error)
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw mapAuthError(error)
    }
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/internal-error' ||
      authMessage(error).includes('Cross-Origin-Opener-Policy') ||
      authMessage(error).includes('policy would block')
    ) {
      console.warn('[auth] popup failed — redirect', code, error)
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
    const msg = authMessage(error)
    if (msg.includes('Database is closing') || msg.includes('closing/hidden')) {
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

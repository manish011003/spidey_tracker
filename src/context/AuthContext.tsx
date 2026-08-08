import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { User } from 'firebase/auth'
import type { UserProfile } from '../types'
import { isFirebaseConfigured, requireAuth } from '../services/firebase/config'
import {
  clearRedirectPending,
  confirmPhoneVerificationCode,
  handleRedirectResult,
  hardResetToLogin,
  isRedirectPending,
  resetPhoneSignIn,
  sendPhoneVerificationCode,
  signInWithGoogle,
  signOut as firebaseSignOut,
  subscribeToAuth,
} from '../services/firebase/auth'
import { ensureUserShell, getUserProfile, mapUserDoc } from '../services/firebase/users'
import { doc, onSnapshot } from 'firebase/firestore'
import { requireDb } from '../services/firebase/config'
import { syncFriendAccessList, syncPartnerAccess } from '../services/firebase/presence'

type AuthContextValue = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  configured: boolean
  returningFromGoogle: boolean
  phoneCodeSent: boolean
  phoneHint: string | null
  signIn: () => Promise<void>
  startPhoneSignIn: (phone: string) => Promise<void>
  confirmPhoneSignIn: (code: string) => Promise<void>
  cancelPhoneSignIn: () => void
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function formatShellError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  const code = (e as { code?: string })?.code
  if (code === 'permission-denied' || raw.toLowerCase().includes('permission')) {
    return 'PROFILE PERMISSION DENIED — CHECK FIRESTORE RULES'
  }
  if (raw.includes('Unsupported field value') || raw.includes('undefined')) {
    return 'PROFILE WRITE FAILED — RETRY SIGN-IN'
  }
  return `FAILED TO LOAD SPIDER PROFILE${code ? ` (${code})` : ''}`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [returningFromGoogle, setReturningFromGoogle] = useState(() => isRedirectPending())
  const [phoneCodeSent, setPhoneCodeSent] = useState(false)
  const [phoneHint, setPhoneHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const shellGen = useRef(0)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setInitializing(false)
      return
    }

    let unsub: (() => void) | undefined
    let cancelled = false
    let pendingWatch: number | undefined

    void (async () => {
      const pending = isRedirectPending()
      if (pending) setReturningFromGoogle(true)

      try {
        await handleRedirectResult()
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'IDENTITY VERIFICATION FAILED')
          clearRedirectPending()
          setReturningFromGoogle(false)
        }
      }
      if (cancelled) return

      // If redirect already signed us in, attach immediately
      try {
        const current = requireAuth().currentUser
        if (current) {
          clearRedirectPending()
          setReturningFromGoogle(false)
        }
      } catch {
        /* ignore */
      }

      unsub = subscribeToAuth((next) => {
        const gen = ++shellGen.current
        setUser(next)

        if (!next) {
          setProfile(null)
          setInitializing(false)
          setSigningIn(false)

          if (isRedirectPending()) {
            if (pendingWatch) window.clearTimeout(pendingWatch)
            // Give mobile Safari time to hydrate session after same-origin redirect
            pendingWatch = window.setTimeout(() => {
              if (cancelled) return
              try {
                if (requireAuth().currentUser) return
              } catch {
                /* ignore */
              }
              if (isRedirectPending()) {
                clearRedirectPending()
                setReturningFromGoogle(false)
                setSigningIn(false)
                setInitializing(false)
                setError('SIGN-IN DID NOT COMPLETE — TAP SIGN IN AGAIN')
              }
            }, 12_000)
          }
          return
        }

        if (pendingWatch) window.clearTimeout(pendingWatch)
        clearRedirectPending()
        setReturningFromGoogle(false)

        void (async () => {
          try {
            const shell = await ensureUserShell(next)
            if (cancelled || gen !== shellGen.current) return
            setProfile(shell)
            setError(null)
            setPhoneCodeSent(false)
            setPhoneHint(null)
          } catch (e) {
            console.error('[auth] ensureUserShell failed', e)
            try {
              const fallback = await getUserProfile(next.uid)
              if (fallback && !cancelled && gen === shellGen.current) {
                setProfile(fallback)
                setError(null)
                setPhoneCodeSent(false)
                setPhoneHint(null)
                return
              }
            } catch {
              /* ignore */
            }
            if (!cancelled && gen === shellGen.current) {
              setError(formatShellError(e))
            }
          } finally {
            if (!cancelled && gen === shellGen.current) {
              setInitializing(false)
              setSigningIn(false)
            }
          }
        })()
      })
    })()

    return () => {
      cancelled = true
      unsub?.()
      if (pendingWatch) window.clearTimeout(pendingWatch)
    }
  }, [])

  useEffect(() => {
    if (!user || !isFirebaseConfigured) return
    const db = requireDb()
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          const next = mapUserDoc(user.uid, snap.data() as Record<string, unknown>)
          setProfile(next)
          void (async () => {
            try {
              await syncPartnerAccess(user.uid, next.partnerId)
              await syncFriendAccessList(user.uid, next.friendIds ?? [])
            } catch {
              /* rules/network */
            }
          })()
        }
      },
      (err) => {
        console.error('[auth] profile snapshot error', err)
        setError('PROFILE SYNC FAILED — CHECK CONNECTION / RULES')
      },
    )
    return unsub
  }, [user])

  const signIn = useCallback(async () => {
    setError(null)
    setSigningIn(true)
    try {
      await signInWithGoogle()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'IDENTITY VERIFICATION FAILED'
      if (msg === 'REDIRECT_STARTED') {
        setReturningFromGoogle(true)
        return
      }
      setError(msg)
      setSigningIn(false)
      setReturningFromGoogle(false)
      return
    }
    window.setTimeout(() => setSigningIn(false), 20_000)
  }, [])

  const startPhoneSignIn = useCallback(async (phone: string) => {
    setError(null)
    setSigningIn(true)
    try {
      const normalized = await sendPhoneVerificationCode(phone)
      setPhoneHint(normalized)
      setPhoneCodeSent(true)
    } catch (e) {
      setPhoneCodeSent(false)
      setPhoneHint(null)
      setError(e instanceof Error ? e.message : 'SMS SEND FAILED')
    } finally {
      setSigningIn(false)
    }
  }, [])

  const confirmPhoneSignIn = useCallback(async (code: string) => {
    setError(null)
    setSigningIn(true)
    try {
      await confirmPhoneVerificationCode(code)
      // onAuthStateChanged loads profile; keep verifying briefly
      window.setTimeout(() => setSigningIn(false), 20_000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'CODE VERIFY FAILED')
      setSigningIn(false)
    }
  }, [])

  const cancelPhoneSignIn = useCallback(() => {
    resetPhoneSignIn()
    setPhoneCodeSent(false)
    setPhoneHint(null)
    setError(null)
    setSigningIn(false)
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    setSigningIn(false)
    setReturningFromGoogle(false)
    resetPhoneSignIn()
    setPhoneCodeSent(false)
    setPhoneHint(null)
    try {
      await firebaseSignOut()
    } finally {
      setProfile(null)
      setUser(null)
      setInitializing(false)
      hardResetToLogin()
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const p = await getUserProfile(user.uid)
    setProfile(p)
  }, [user])

  const loading = initializing || signingIn || returningFromGoogle

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      error,
      configured: isFirebaseConfigured,
      returningFromGoogle,
      phoneCodeSent,
      phoneHint,
      signIn,
      startPhoneSignIn,
      confirmPhoneSignIn,
      cancelPhoneSignIn,
      signOut,
      refreshProfile,
      clearError: () => setError(null),
    }),
    [
      user,
      profile,
      loading,
      error,
      returningFromGoogle,
      phoneCodeSent,
      phoneHint,
      signIn,
      startPhoneSignIn,
      confirmPhoneSignIn,
      cancelPhoneSignIn,
      signOut,
      refreshProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

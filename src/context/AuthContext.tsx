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
import { isFirebaseConfigured } from '../services/firebase/config'
import {
  handleRedirectResult,
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
  signIn: () => Promise<void>
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
  /** First auth + profile hydrate */
  const [initializing, setInitializing] = useState(true)
  /** Google popup / redirect in progress (button only) */
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shellGen = useRef(0)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setInitializing(false)
      return
    }

    let unsub: (() => void) | undefined
    let cancelled = false

    void (async () => {
      try {
        await handleRedirectResult()
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'IDENTITY VERIFICATION FAILED')
        }
      }
      if (cancelled) return

      unsub = subscribeToAuth((next) => {
        const gen = ++shellGen.current
        setUser(next)

        if (!next) {
          setProfile(null)
          setInitializing(false)
          setSigningIn(false)
          return
        }

        void (async () => {
          try {
            const shell = await ensureUserShell(next)
            if (cancelled || gen !== shellGen.current) return
            setProfile(shell)
            setError(null)
          } catch (e) {
            console.error('[auth] ensureUserShell failed', e)
            try {
              const fallback = await getUserProfile(next.uid)
              if (fallback && !cancelled && gen === shellGen.current) {
                setProfile(fallback)
                setError(null)
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
      // Popup success — profile hydrate continues in onAuthStateChanged
      // Keep signingIn until shell loads (cleared there). Safety timeout below.
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'IDENTITY VERIFICATION FAILED'
      if (msg === 'REDIRECT_STARTED') {
        // Full-page navigation; leave signingIn true until unload
        return
      }
      setError(msg)
      setSigningIn(false)
      return
    }
    // If auth listener is slow, don't trap the button forever
    window.setTimeout(() => setSigningIn(false), 20_000)
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    setSigningIn(false)
    try {
      await firebaseSignOut()
    } finally {
      setProfile(null)
      setUser(null)
      setInitializing(false)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const p = await getUserProfile(user.uid)
    setProfile(p)
  }, [user])

  const loading = initializing || signingIn

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      error,
      configured: isFirebaseConfigured,
      signIn,
      signOut,
      refreshProfile,
      clearError: () => setError(null),
    }),
    [user, profile, loading, error, signIn, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

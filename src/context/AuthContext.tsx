import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import { ensureUserShell, getUserProfile } from '../services/firebase/users'
import { doc, onSnapshot } from 'firebase/firestore'
import { requireDb } from '../services/firebase/config'
import { mapUserDoc } from '../services/firebase/users'
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }

    void handleRedirectResult().catch(() => undefined)

    const unsub = subscribeToAuth(async (next) => {
      setUser(next)
      if (!next) {
        setProfile(null)
        setLoading(false)
        return
      }
      try {
        const shell = await ensureUserShell(next)
        setProfile(shell)
      } catch {
        setError('FAILED TO LOAD SPIDER PROFILE')
      } finally {
        setLoading(false)
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!user || !isFirebaseConfigured) return
    const db = requireDb()
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const next = mapUserDoc(user.uid, snap.data() as Record<string, unknown>)
        setProfile(next)
        // Await mirrors so friend/partner presence listeners are authorized
        void (async () => {
          try {
            await syncPartnerAccess(user.uid, next.partnerId)
            await syncFriendAccessList(user.uid, next.friendIds ?? [])
          } catch {
            /* rules/network — useMultiPresence retries */
          }
        })()
      }
    })
    return unsub
  }, [user])

  const signIn = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'IDENTITY VERIFICATION FAILED'
      if (msg !== 'REDIRECT_STARTED') setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    await firebaseSignOut()
    setProfile(null)
    setUser(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const p = await getUserProfile(user.uid)
    setProfile(p)
  }, [user])

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

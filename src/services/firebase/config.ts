import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  type Auth,
} from 'firebase/auth'
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore'
import { getDatabase, type Database } from 'firebase/database'

const envAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined

/**
 * On Vercel (and any non-localhost host), use the page hostname as authDomain
 * so Google redirect stays same-origin via the `/__/auth` proxy in vercel.json.
 * Cross-origin authDomain (*.firebaseapp.com) is what breaks mobile Safari login.
 */
function resolveAuthDomain(fallback: string | undefined): string | undefined {
  if (!fallback) return fallback
  if (typeof window === 'undefined') return fallback
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') return fallback
  return host
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: resolveAuthDomain(envAuthDomain),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined,
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    firebaseConfig.databaseURL,
)

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let rtdb: Database | null = null

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)

  try {
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    })
  } catch {
    auth = getAuth(app)
  }

  try {
    initializeFirestore(app, { ignoreUndefinedProperties: true })
  } catch {
    /* HMR remount */
  }
  db = getFirestore(app)
  rtdb = getDatabase(app)
}

export { app, auth, db, rtdb }

export function requireAuth(): Auth {
  if (!auth) throw new Error('Firebase Auth is not configured. Copy .env.example to .env')
  return auth
}

export function requireDb(): Firestore {
  if (!db) throw new Error('Firestore is not configured. Copy .env.example to .env')
  return db
}

export function requireRtdb(): Database {
  if (!rtdb) throw new Error('Realtime Database is not configured. Copy .env.example to .env')
  return rtdb
}

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

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
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

  // Mobile Google redirect REQUIRES browserPopupRedirectResolver.
  // Plain getAuth() often "succeeds" on Google then returns with no session on iOS/Android.
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

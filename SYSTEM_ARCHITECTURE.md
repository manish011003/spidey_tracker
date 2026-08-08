# Spidey Tracker — System Architecture

**MADE BY MANISH** · Social Spider Adventure + private partner/friend web  
Document version: 1.0 · Stack: React 19 / TypeScript / Vite / Firebase / Leaflet

This file is the engineering reference for **high-level design (HLD)** and **low-level design (LLD)**. Prefer extending existing modules over rewriting UI.

---

## 1. Product intent

Spidey Tracker is a **pixel-HUD web app** that started as a private BF/GF location console and evolved into a **social Spider-Man–inspired adventure platform**:

| Pillar | Behavior |
|--------|----------|
| Partner | One exclusive romantic partner link (code-based) |
| Friends | Multi-friend web with **requests** (not auto-add) |
| Map | Dark Leaflet map: self, sharing friends/partner, events, discoveries |
| Adventure | XP, levels, suits unlock, quizzes, missions, achievements, Easter eggs |
| Privacy | Location is **opt-in**; friendship ≠ location access |

**Non-goals:** location history storage, modern social-media dashboard UI, Marvel/Samsung branding.

---

## 2. High-level design (HLD)

### 2.1 System context

```
┌─────────────┐     HTTPS      ┌──────────────────┐
│  Browser    │◄──────────────►│  Vercel (static) │
│  React SPA  │                │  dist/ SPA       │
└──────┬──────┘                └──────────────────┘
       │
       │ Firebase JS SDK
       ▼
┌──────────────────────────────────────────────────┐
│                   Firebase                        │
│  Auth (Google) │ Firestore │ Realtime Database   │
└──────────────────────────────────────────────────┘
       │
       ├── Nominatim (geocode / reverse) — optional
       └── Carto / OSM tiles (map imagery)
```

- **Hosting:** Vercel serves the Vite build (`dist/`). SPA rewrites → `index.html`.
- **Backend:** No custom Node API. All persistence and realtime via Firebase client SDK + security rules.
- **Secrets:** Only `VITE_*` public Firebase web config (client-safe). Real security is Auth + rules.

### 2.2 Logical layers

```
┌─────────────────────────────────────────────────────────┐
│  Presentation   pages/, components/, pixel HUD, map     │
├─────────────────────────────────────────────────────────┤
│  State / hooks  AuthContext, usePresence, useFriends…   │
├─────────────────────────────────────────────────────────┤
│  Domain         data/* catalogs, utils/progression      │
├─────────────────────────────────────────────────────────┤
│  Services       services/firebase/*, location, sound    │
├─────────────────────────────────────────────────────────┤
│  Infrastructure Firebase Auth / Firestore / RTDB / CDN  │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Runtime routes

| Route | Gate | Purpose |
|-------|------|---------|
| `/` | Redirect by auth | Landing vs tracker vs onboarding |
| `/login` | Public | Google sign-in + boot |
| `/onboarding` | Auth + incomplete | Role, spider, suit, optional partner |
| `/tracker` | Auth + complete | Main adventure HUD |
| `/settings` | Auth + complete | Preferences (legacy/secondary) |

`ProtectedRoute` enforces onboarding completeness.

### 2.4 Core domain capabilities

1. **Identity** — Google Auth → `users/{uid}` shell → onboarding → adventure seed  
2. **Social graph** — partner (1:1 relationship) + friends (N) + friend requests  
3. **Presence** — online/offline + optional lat/lng in RTDB  
4. **Shared memory** — relationship-scoped events on map + list UI  
5. **Adventure loop** — XP → level → suit unlocks; quizzes/missions/discoveries  
6. **UX shell** — pixel frame, side orbs, ticker, radar, clickable deck spider  

### 2.5 Data store split (intentional)

| Store | What lives here | Why |
|-------|-----------------|-----|
| **Firestore** | Profiles, codes, relationships, events, adventure progress, friend lists/requests | Structured docs, queries, durable |
| **Realtime DB** | `presence/{uid}`, `partnerAccess`, `friendAccess`, `nudges` | Low-latency live location + nudge fanout |
| **Client catalogs** | Quizzes, missions, achievements, discovery seeds | Versioned with app deploy; no admin CMS yet |

**Important:** No location history. Only current coordinates while sharing is enabled.

### 2.6 Privacy model (HLD)

```
Friend / Partner link
        │
        ▼
  Can read Firestore profile (suit, level, name…)
        │
        ✗ does NOT grant location
        │
Location sharing toggle (preferences + RTDB flags)
        │
        ▼
  Peers with partnerAccess / friendAccess may read presence/{uid}
```

Rules enforce: presence readable by self, linked partner (via `partnerAccess` mirror), or friend (via `friendAccess/{viewer}/{target}=true`).

---

## 3. Low-level design (LLD)

### 3.1 Repository layout

```
src/
  App.tsx                 # Router
  main.tsx
  types/index.ts          # Shared TS contracts
  context/AuthContext.tsx # Session + profile snapshot
  pages/                  # Route screens
  components/
    layout/               # TrackerShell, ProtectedRoute
    tracker/              # Header, side controls, toolbar, ticker
    map/                  # Leaflet map + markers
    partner/              # Partner panel, link modal
    profile/              # Settings / character edit
    adventure/            # Dossier, friends hub, quiz, missions, discoveries
    events/               # List, create, detail
    onboarding/           # Setup flow + web guide chart
    pixel/                # Design-system primitives
  hooks/                  # Presence, friends, events, location
  services/
    firebase/             # Auth, users, relationships, friends, adventure…
    location/             # Geolocation wrapper
    geocoding/            # Nominatim
    sound/                # SFX + ringtone
  data/                   # Static catalogs (suits, spiders, adventure)
  utils/                  # Progression, geo, partner codes
  assets/                 # Suit sprites, logo variants
firestore.rules
database.rules.json
```

### 3.2 Key TypeScript models

Defined in `src/types/index.ts`:

- **`UserProfile`** — identity, `spiderId` / `suitId`, `partnerId`, `relationshipId`, `friendIds`, `incomingFriendRequests`, `outgoingFriendRequests`, `preferences`, **`adventure`**
- **`AdventureProgress`** — `xp`, `level`, `unlockedSuits`, `achievements`, `completedMissions`, `discoveries`, `missionProgress`, quiz streak fields
- **`PresenceData`** — online, lastSeen, sharing flags, lat/lng, accuracy, heading, speed, timestamp
- **`SharedEvent`** — title, geo, date, icon, createdBy
- **`Relationship`** — two `memberIds`, status

Catalogs (not Firestore): `MissionDef`, `QuizDef`, `DiscoveryDef`, `AchievementDef` in `src/data/adventure.ts`.

### 3.3 Firestore schema (LLD)

#### `users/{uid}`

| Field | Notes |
|-------|--------|
| `uid`, `email`, `displayName`, `nickname`, `photoURL` | Identity |
| `role` | `boyfriend` \| `girlfriend` \| `friend` |
| `spiderId`, `suitId` | Cosmetics |
| `partnerCode` | Immutable after create (rules) |
| `partnerId`, `relationshipId` | Exclusive partner slot |
| `friendIds[]` | Mutual friends |
| `incomingFriendRequests[]` / `outgoingFriendRequests[]` | Request flow |
| `onboardingComplete` | Route gate |
| `preferences` | sound, reduceMotion, locationSharing, hasSeenGuide… |
| `adventure` | XP/RPG blob (self-writable) |

#### `partnerCodes/{CODE}`

`{ uid, createdAt }` — O(1) code → uid lookup.

#### `relationships/{relationshipId}`

`{ memberIds: [uidA, uidB], status, createdAt }`

#### `relationships/{id}/events/{eventId}`

Shared couple events (create/list/map).

### 3.4 Realtime Database schema (LLD)

```
presence/{uid}
  online, lastSeen, locationSharingEnabled, preciseLocationEnabled
  latitude?, longitude?, accuracy?, heading?, speed?, timestamp?

partnerAccess/{uid}/partnerId   → string | null   (mirror for rules)

friendAccess/{uid}/{friendId}   → true            (mirror for rules)

nudges/{toUid}
  fromUid, fromName, timestamp   (ephemeral; cleared after consume)
```

**Mirror sync:** On profile snapshot, client writes `partnerAccess` + full `friendAccess/{self}` from `friendIds`. Each user can only write **their own** access node.

### 3.5 Security rules (summary)

**Firestore (`firestore.rules`)**

- Self full profile update (email/partnerCode sticky).
- Partner link/unlink via constrained field diffs.
- Friend add/remove and friend-request field updates via constrained diffs.
- Relationship + events: members only.

**RTDB (`database.rules.json`)**

- Default deny.
- Presence write: self only; read: self / partnerAccess / friendAccess.
- Nudges: sender creates; recipient reads/deletes.

Deploy:

```bash
npx firebase-tools deploy --only firestore:rules,database
```

### 3.6 Module responsibilities (LLD)

| Module | Responsibility |
|--------|----------------|
| `services/firebase/auth.ts` | Google popup/redirect, unauthorized-domain mapping |
| `services/firebase/users.ts` | Shell create, mapUserDoc, preferences, onboarding complete (+ adventure seed) |
| `services/firebase/relationships.ts` | Partner link/unlink transaction |
| `services/firebase/friends.ts` | `sendFriendRequest`, accept/decline, remove; RTDB friendAccess sync |
| `services/firebase/adventure.ts` | `awardXp`, missions bump, quiz result, discovery claim, equip suit |
| `services/firebase/presence.ts` | Presence lifecycle, publish location, access mirrors |
| `services/firebase/events.ts` | Subscribe/create relationship events |
| `services/firebase/nudge.ts` | Ringtone nudge fanout |
| `utils/progression.ts` | XP curve, level, suit unlock table |
| `hooks/useLocationSharing.ts` | Watch position → RTDB when sharing on |
| `hooks/useFriends.ts` | Live friend profile snapshots |
| `hooks/usePresence.ts` | Self / partner / multi-friend presence |

### 3.7 Progression algorithm (LLD)

```
xpForLevel(L) ≈ 80 + 45L + 12·L^1.35
level = max L such that sum(xpForLevel(1..L-1)) ≤ totalXp
```

- Suit unlock thresholds: `SUIT_UNLOCK_LEVEL` in `utils/progression.ts` (classic@1 … ghost@12).
- Equipping checks `isSuitUnlocked(level, unlockedSuits)`.
- Daily/weekly missions reset via `dailyKey` / `weeklyKey` inside `normalizeAdventure()`.

### 3.8 Major UI surfaces (LLD)

| Surface | Trigger | Opens |
|---------|---------|-------|
| Deck spider | Click large sprite | `CharacterSheet` (dossier) |
| Cyan `i` orb | Side controls | `OnboardingChart` (web guide) |
| Yellow ★ | Side / toolbar | `EventsPanel` → create / detail / fly |
| Header other spider | Click / dropdown | Partner or friend signal panel |
| Toolbar | QUEST / QUIZ / CREW | Missions / Quiz / FriendsHub |
| Map pins | Self, partner/friends (if sharing), events, discoveries `?` | Panels / popups |

### 3.9 Critical sequences

#### A. First-time user

```
Google sign-in
  → ensureUserShell (users/{uid}, partnerCode)
  → /onboarding (role, spider, suit, name)
  → completeOnboarding (adventure seed + first_web)
  → /tracker
  → OnboardingChart once (hasSeenGuide)
```

#### B. Friend request

```
A enters B's spider code
  → sendFriendRequest
  → A.outgoing += B ; B.incoming += A
B accepts
  → both friendIds updated; requests cleared
  → A syncs friendAccess/A/B=true
  → B syncs friendAccess on next profile load
Location still private until each opts in
```

#### C. Location share

```
Toggle SHARE MY LOCATION
  → preferences.locationSharingEnabled
  → geolocation watch
  → presence/{uid} update (lat/lng + flags)
Partner/friend with access mirror may subscribe
```

#### D. Discovery claim

```
User near public POI (haversine ≤ radiusM)
  + location sharing on
  → recordDiscovery → XP + discovery id + optional suit
  → mission bumps (discovery_any / explore_*)
```

#### E. Quiz

```
pickRandomQuiz → answers → recordQuizResult
  → streak by calendar day
  → XP + mission daily_quiz / weekly_quiz_3
```

### 3.10 Map integration (LLD)

`TrackerMap` (react-leaflet):

- Tiles: `VITE_MAP_TILE_URL` (default Carto Dark Matter)
- Markers: `SelfMarker`, `PartnerMarker` (partner + friends), `EventMarker`, `DiscoveryMarker`
- Friend markers only if `presence.locationSharingEnabled` and coords present
- Discoveries always shown as clue pins (found state dimmed)

### 3.11 Client state strategy

- **Source of truth:** Firestore profile snapshot in `AuthContext` (`onSnapshot`).
- **Derived adventure:** `normalizeAdventure(profile.adventure)` for UI.
- **Ephemeral UI:** modal open flags, `flyTo` nonce, nudge banner — local React state in `TrackerPage`.
- Avoid redundant global stores; page orchestrates panels.

### 3.12 Environment & build

| Variable | Role |
|----------|------|
| `VITE_FIREBASE_API_KEY` … `APP_ID` | Firebase web app |
| `VITE_FIREBASE_DATABASE_URL` | RTDB endpoint |
| `VITE_MAP_TILE_URL` / `ATTRIBUTION` | Leaflet |
| `VITE_GEOCODER_URL` / `USER_AGENT` | Nominatim |

```bash
npm run dev      # Vite
npm run build    # tsc -b && vite build
npm run preview  # local dist
```

Vercel: Framework Vite, output `dist`, build `npm run build`, SPA rewrite to `index.html`.  
After env changes: **redeploy** (Vite inlines env at build time).

Auth: add `*.vercel.app` (and custom domains) under Firebase → Authentication → Authorized domains.

---

## 4. Cross-cutting concerns

### 4.1 Visual system

- CSS variables in global / `pixel.css` (`--spidey-*`)
- Primitives: `PixelButton`, `PixelModal`, `PixelPanel`, orbs, XP bar
- Pixel fonts (Press Start 2P), nearest-neighbor sprites
- **Do not** replace with card-heavy modern dashboard patterns

### 4.2 Audio

`services/sound/audio.ts` — muted by default (`soundEnabled: false`). Ringtone for pair/nudge; unlock on user gesture.

### 4.3 Error UX

User-facing uppercase pixel strings (`FAILED TO LOAD SPIDER PROFILE`, etc.). Prefer mapping Firebase codes in services.

### 4.4 Performance notes

- Suit/logo assets may inline as data URLs for Leaflet `DivIcon`
- Multi-friend presence = N RTDB listeners (cap friends ~12)
- Discovery list is static seed size (small)

### 4.5 Testing / ops checklist

1. Rules deployed (Firestore + RTDB)  
2. Google Auth domain authorized  
3. Vercel env filled + redeploy  
4. Partner link + friend request accept  
5. Location opt-in visible only to peers with access  
6. Events list + map pin  
7. Quiz XP + mission board update  
8. Discovery claim in radius  

---

## 5. Extension guidelines

When adding features:

1. Prefer **new catalog entries** in `data/adventure.ts` over new collections when content is static.  
2. Persist progress on **`users.adventure`** unless you need multi-player queries.  
3. Any new live geo field → **RTDB presence**, never Firestore history.  
4. New peer-read paths → update **Firestore rules** and/or **access mirrors**.  
5. Keep entry points in existing HUD (sprite, toolbar, side orbs, header).  
6. Update this document when schemas or flows change.

---

## 6. Glossary

| Term | Meaning |
|------|---------|
| Spider code | Shareable `XXXX-XXXX` partner/friend invite code |
| Partner | Exclusive BF/GF link + relationship doc |
| Friend web | Multi-friend graph with requests |
| Dossier | Character sheet (XP, suits, badges) |
| Discovery | Location Easter egg at public POI |
| Access mirror | RTDB copy of partner/friend ids for presence rules |

---

## 7. Related files

| File | Purpose |
|------|---------|
| `README.md` | Setup & product overview |
| `.env.example` | Env contract |
| `firestore.rules` | Document ACL |
| `database.rules.json` | Live ACL |
| `firebase.json` | Firebase deploy targets |
| `src/types/index.ts` | Canonical types |

---

*End of architecture document. Keep HLD stable; evolve LLD with incremental PRs.*

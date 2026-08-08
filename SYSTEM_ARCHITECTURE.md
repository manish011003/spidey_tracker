# Spidey Tracker — System Architecture

**MADE BY MANISH** · Social Spider adventure + private partner/friend web  
Document version: **2.0** · Stack: React 19 / TypeScript / Vite / Firebase / Leaflet / Vercel

Engineering reference for **high-level design (HLD)** and **low-level design (LLD)**.  
Product overview & contributor setup → [`README.md`](./README.md).

Prefer extending existing modules over rewriting the pixel HUD.

---

## 1. Product intent

Spidey Tracker is a **pixel-HUD web app** that began as a private BF/GF location console and grew into a **social Spider-Man–inspired adventure platform**:

| Pillar | Behavior |
|--------|----------|
| Partner | One exclusive romantic partner link (spider code) |
| Friends | Multi-friend web with **requests** (not auto-add) |
| Map | Dark Leaflet map: self, sharing friends/partner, events, **nearby** discoveries |
| Adventure | XP, levels, suits, quizzes, missions, achievements, landmark quests |
| Social invite | Share spider code via WhatsApp / Instagram / native share / clipboard |
| Privacy | Location is **opt-in**; friendship ≠ location access |

**Non-goals:** location history storage, modern SaaS dashboard UI, Marvel/Samsung branding.

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
       ├── Overpass API (nearby POIs for quests) — optional / best-effort
       ├── Nominatim (geocode / reverse) — optional
       └── Carto / OSM tiles (map imagery)
```

- **Hosting:** Vercel serves the Vite `dist/` build. SPA rewrite → `index.html`. COOP header allows Google popup auth (`same-origin-allow-popups`).
- **Backend:** No custom Node API. Persistence + realtime via Firebase client SDK + security rules.
- **Secrets:** Only `VITE_*` public Firebase web config. Real security is Auth + rules.

### 2.2 Logical layers

```
┌─────────────────────────────────────────────────────────┐
│  Presentation   pages/, components/, pixel HUD, map     │
├─────────────────────────────────────────────────────────┤
│  State / hooks  AuthContext, usePresence, useFriends…   │
├─────────────────────────────────────────────────────────┤
│  Domain         data/* catalogs, utils/progression      │
├─────────────────────────────────────────────────────────┤
│  Services       firebase/*, discoveries/, location, sound│
├─────────────────────────────────────────────────────────┤
│  Infrastructure Firebase Auth / Firestore / RTDB / CDN  │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Runtime routes

| Route | Gate | Purpose |
|-------|------|---------|
| `/` | Redirect by auth | Landing ↔ onboarding ↔ tracker |
| `/login` | Public | Google sign-in + boot (auto-redirects when session ready) |
| `/onboarding` | Auth + incomplete | Role, spider, suit, name, optional partner + **share code** |
| `/tracker` | Auth + complete | Main adventure HUD |
| `/settings` | Auth + complete | Preferences (secondary) |

`ProtectedRoute` enforces onboarding completeness and shows a loader while profile hydrates.

### 2.4 Core domain capabilities

1. **Identity** — Google Auth → `users/{uid}` shell → onboarding → adventure seed  
2. **Social graph** — partner (1:1) + friends (N) + friend requests  
3. **Invite share** — spider code → WhatsApp / Instagram (copy+open) / Web Share API  
4. **Presence** — online/offline + optional lat/lng in RTDB  
5. **Shared memory** — relationship-scoped events on map + list UI  
6. **Adventure loop** — XP → level → suits; quizzes / missions / **dynamic nearby discoveries**  
7. **Map spider tour** — side orb cycles pins (overview → focus → popup)  
8. **UX shell** — pixel frame, side orbs, ticker, radar, clickable deck spider  

### 2.5 Data store split

| Store | What lives here | Why |
|-------|-----------------|-----|
| **Firestore** | Profiles, codes, relationships, events, adventure, friend lists/requests | Durable docs |
| **Realtime DB** | `presence/{uid}`, `partnerAccess`, `friendAccess`, `nudges` | Live location + nudge fanout |
| **Client catalogs** | Quizzes, missions, achievements (static defs) | Versioned with app deploy |
| **Runtime POIs** | Nearby discoveries from Overpass + procedural sector nodes | Not persisted as a catalog; claims store IDs on `adventure.discoveries` |

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
    tracker/              # Header, side controls, toolbar, FindSpiderPanel
    map/                  # Leaflet map + markers + fly/overview
    partner/              # Partner panel, link modal
    profile/              # Settings / character edit + share code
    adventure/            # Dossier, friends, quiz, missions, discoveries
    share/                # ShareCodeButtons (WhatsApp / IG / native)
    events/               # List, create, detail
    onboarding/           # Setup flow + web guide chart
    pixel/                # Design-system primitives
  hooks/                  # Presence, friends, events, location, nearbyDiscoveries
  services/
    firebase/             # Auth, users, relationships, friends, adventure…
    discoveries/          # Overpass + procedural nearby quests
    location/             # Geolocation wrapper
    geocoding/            # Nominatim
    sound/                # SFX + ringtone
  data/                   # Static catalogs (suits, spiders, adventure)
  utils/                  # Progression, geo, partner codes, shareInvite
  assets/                 # Suit sprites, logo variants
firestore.rules
database.rules.json
vercel.json               # SPA rewrite + COOP header
SYSTEM_ARCHITECTURE.md    # This file
README.md                 # Contributor entrypoint
```

### 3.2 Key TypeScript models

Defined in `src/types/index.ts`:

- **`UserProfile`** — identity, cosmetics, partner/friends/requests, preferences, **`adventure`**
- **`AdventureProgress`** — xp, level, unlockedSuits, achievements, missions, discoveries, quiz fields
- **`PresenceData`** — online, lastSeen, sharing flags, lat/lng, motion fields
- **`SharedEvent`** / **`Relationship`**

Catalogs: `MissionDef`, `QuizDef`, `DiscoveryDef`, `AchievementDef` in `src/data/adventure.ts`.  
Runtime discoveries implement the same `DiscoveryDef` shape via `services/discoveries/nearbyDiscoveries.ts`.

### 3.3 Firestore schema (LLD)

#### `users/{uid}`

| Field | Notes |
|-------|--------|
| Identity | `uid`, `email`, `displayName`, `nickname`, `photoURL` |
| Cosmetics | `role`, `spiderId`, `suitId`, `statusMessage` |
| `partnerCode` | Shareable `XXXX-XXXX`; owner may refresh if code index races |
| Partner | `partnerId`, `relationshipId` |
| Friends | `friendIds[]`, `incomingFriendRequests[]`, `outgoingFriendRequests[]` |
| Gate | `onboardingComplete` |
| `preferences` | sound, reduceMotion, locationSharing, hasSeenGuide… |
| `adventure` | XP/RPG blob |

Firestore is initialized with **`ignoreUndefinedProperties: true`** so Google accounts without `photoURL` can create shells.

#### `partnerCodes/{CODE}`

`{ uid, createdAt }` — O(1) code → uid. Create-only; no overwrite of another user’s code.

#### `relationships/{id}` (+ `events` subcollection)

Couple/shared memory for the exclusive partner link.

### 3.4 Realtime Database schema (LLD)

```
presence/{uid}
  online, lastSeen, locationSharingEnabled, preciseLocationEnabled
  latitude?, longitude?, accuracy?, heading?, speed?, timestamp?

partnerAccess/{uid}/partnerId   → string | null
friendAccess/{uid}/{friendId}   → true
nudges/{toUid}
  fromUid, fromName, timestamp
```

**Mirror sync:** On profile snapshot, client writes `partnerAccess` + `friendAccess/{self}` from `friendIds`.

### 3.5 Security rules (summary)

**Firestore**

- Self create shell (`onboardingComplete == false`, null partner fields).
- Self update: sticky `uid` + `email`; may change `partnerCode`.
- Peer partner link/unlink and friend-request diffs via constrained `affectedKeys`.
- Onboarded profiles readable by any signed-in user (code lookup / requests).
- Relationships + events: members only.

**RTDB**

- Default deny.
- Presence write: self; read: self / partnerAccess / friendAccess.
- Nudges: sender creates; recipient reads/clears.

```bash
npx firebase-tools deploy --only firestore:rules,database
```

### 3.6 Module responsibilities (LLD)

| Module | Responsibility |
|--------|----------------|
| `services/firebase/auth.ts` | Google popup + redirect fallback; OAuth/domain error mapping |
| `services/firebase/users.ts` | Shell create, partner-code claim (non-blocking), onboarding |
| `services/firebase/friends.ts` | Friend requests accept/decline/remove + access sync |
| `services/firebase/relationships.ts` | Partner link/unlink |
| `services/firebase/adventure.ts` | XP, quiz, discovery claim, missions, equip suit |
| `services/firebase/presence.ts` | Presence lifecycle, location publish, access mirrors |
| `services/discoveries/nearbyDiscoveries.ts` | Overpass nearby POIs + seeded local web-nodes |
| `hooks/useNearbyDiscoveries.ts` | Sector-keyed fetch; GPS fallback for quests |
| `utils/shareInvite.ts` | Invite message, WhatsApp URL, native share, clipboard |
| `components/share/ShareCodeButtons.tsx` | HUD share controls |
| `components/tracker/FindSpiderPanel.tsx` | Search friends / add by code / fly to spider |
| `utils/progression.ts` | XP curve + suit unlock table |

### 3.7 Nearby discoveries (LLD)

```
Anchor = presence coords || lastLocal || one-shot GPS
  → sector key ~ lat/lng.toFixed(2) (~1 km)
  → generateLocalDiscoveries (instant)
  → getNearbyDiscoveries (Overpass parks/cafes/temples/malls/attractions ≤ ~2.8 km)
  → fallback / merge if OSM sparse
Map + DiscoveriesPanel consume the same list (sorted by distance)
Claim: haversine ≤ discovery.radiusM → recordDiscovery → XP + missions
```

### 3.8 Spider tour / Find Spider (LLD)

| Control | Behavior |
|---------|----------|
| Toolbar **FIND SPIDER** | Opens `FindSpiderPanel` (list/search/add + fly) |
| Side red orb **CYCLE SPIDERS** | Fit-bounds all visible spiders → fly to next → open Leaflet popup |
| Cycle empty | Opens Find Spider + banner |

`FlyTarget` supports `overviewPoints` + `openPopupUid`; markers open popup after fly delay.

### 3.9 Progression algorithm (LLD)

```
xpForLevel(L) ≈ 80 + 45L + 12·L^1.35
level = max L such that sum(xpForLevel(1..L-1)) ≤ totalXp
```

Suits: `SUIT_UNLOCK_LEVEL` in `utils/progression.ts`.  
Daily/weekly missions reset via keys inside `normalizeAdventure()`.

### 3.10 Major UI surfaces (LLD)

| Surface | Trigger | Opens |
|---------|---------|-------|
| Deck spider | Click sprite | `CharacterSheet` |
| Cyan `i` orb | Side | Web guide chart |
| Yellow ★ | Side / toolbar | Events list |
| Red spider orb | Side | Cycle map spiders + popup |
| Toolbar FIND SPIDER | | FindSpiderPanel |
| QUEST / QUIZ / CREW | Toolbar | Missions / Quiz / FriendsHub |
| Share buttons | Code panels | WhatsApp / IG / copy / native share |
| Map pins | Self, peers, events, discoveries | Popups / panels |

### 3.11 Critical sequences

#### A. First-time user

```
Google sign-in (popup or redirect)
  → ensureUserShell (users/{uid}; partnerCodes best-effort)
  → /onboarding
  → completeOnboarding (adventure seed + first_web)
  → optional share code / partner link
  → /tracker + OnboardingChart once
```

#### B. Friend request

```
A enters B's code → sendFriendRequest
B accepts → mutual friendIds; access mirrors update
Location still private until each opts in
```

#### C. Share invite

```
ShareCodeButtons
  → buildInviteMessage(code, name, appUrl)
  → WhatsApp: wa.me/?text=…
  → Instagram: copy invite + open instagram.com (paste in DM/story)
  → MORE: navigator.share when available
```

#### D. Location share / discovery claim

```
Toggle sharing → geolocation → presence/{uid}
Near POI + in radius → recordDiscovery → XP + mission bumps
```

### 3.12 Map integration (LLD)

`TrackerMap` (react-leaflet):

- Tiles: `VITE_MAP_TILE_URL` (default Carto Dark Matter)
- Markers: self, partner, friends (if sharing), events, dynamic discoveries
- `MapController`: `flyTo` and optional `fitBounds` overview then focus

### 3.13 Client state strategy

- **Source of truth:** Firestore profile `onSnapshot` in `AuthContext`
- **Derived adventure:** `normalizeAdventure(profile.adventure)`
- **Ephemeral:** modals, `flyTo` nonce, `openPopupUid`, spider tour index — `TrackerPage` local state
- No Redux; page orchestrates panels

### 3.14 Environment & build

| Variable | Role |
|----------|------|
| `VITE_FIREBASE_*` | Firebase web app + RTDB URL |
| `VITE_MAP_TILE_URL` / `ATTRIBUTION` | Leaflet |
| `VITE_GEOCODER_URL` / `USER_AGENT` | Nominatim |

```bash
npm run dev      # Vite only (does not run full tsc project build)
npm run build    # tsc -b && vite build  ← what Vercel runs
npm run preview
npm run lint
```

**Deploy tip:** Always run `npm run build` before pushing if you changed TypeScript — Vercel fails on `tsc` errors that `vite` alone may not surface.

Auth: add production domains under Firebase → Authentication → Authorized domains.  
Google Cloud OAuth: configure consent on the **same** GCP project as Firebase (`spidy-tracker`), not an unrelated project.

---

## 4. Cross-cutting concerns

### 4.1 Visual system

- CSS variables `--spidey-*`, Press Start 2P, pixel borders
- Primitives: `PixelButton`, `PixelModal`, XP bar, orbs
- Do **not** replace with card-heavy modern dashboards

### 4.2 Audio

Muted by default. Unlock AudioContext on user gesture. Pair/nudge ringtone in `services/sound/audio.ts`.

### 4.3 Error UX

Uppercase pixel strings. Map Firebase/`auth/*` codes in services. Boot screen shows auth errors; Landing redirects when `user + profile` ready.

### 4.4 Performance

- Multi-friend presence = N RTDB listeners (soft cap ~12 friends)
- Nearby Overpass: sector-keyed; local nodes first
- Suit logos may inline as data URLs for Leaflet `DivIcon`

### 4.5 Ops checklist

1. Firestore + RTDB rules deployed  
2. Google Auth enabled + authorized domains  
3. OAuth consent on correct GCP project (Testing → test users, or Published)  
4. Vercel env vars + redeploy after env changes  
5. Partner link + friend request  
6. Location opt-in visibility  
7. Nearby quests + claim  
8. Share invite opens WhatsApp / copies for IG  
9. `npm run build` green  

---

## 5. Extension guidelines

1. Static content → `data/adventure.ts` catalogs when possible.  
2. Progress → `users.adventure` unless you need multi-player queries.  
3. Live geo → RTDB presence only (never Firestore history).  
4. New peer-read paths → update rules and/or access mirrors.  
5. Keep entry points in existing HUD (sprite, toolbar, side orbs, header).  
6. Run **`npm run build`** before merge.  
7. Update this document when schemas or flows change.

---

## 6. Glossary

| Term | Meaning |
|------|---------|
| Spider code | Shareable `XXXX-XXXX` invite code |
| Partner | Exclusive BF/GF link + relationship doc |
| Friend web | Multi-friend graph with requests |
| Dossier | Character sheet (XP, suits, badges) |
| Discovery / quest | Nearby landmark signal (OSM or sector node) |
| Access mirror | RTDB copy of partner/friend ids for presence rules |
| Sector | ~1 km lat/lng bucket for dynamic quests |

---

## 7. Related files

| File | Purpose |
|------|---------|
| [`README.md`](./README.md) | Contributor setup & overview |
| `.env.example` | Env contract |
| `firestore.rules` / `database.rules.json` | ACL |
| `vercel.json` | SPA + COOP |
| `src/types/index.ts` | Canonical types |
| `src/utils/shareInvite.ts` | Social invite helpers |

---

*Keep HLD stable; evolve LLD with incremental PRs.*

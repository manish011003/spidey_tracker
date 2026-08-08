# SPIDEY TRACKER

A private couples web app that feels like a homemade Spider-Man tracking console Ned Leeds would have built — pixel HUD, dark map, live partner location, and shared spider events.

**MADE BY MANISH** · `SPIDEY TRACKER // PRIVATE NETWORK`

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion (optional accents), Leaflet
- **Auth:** Firebase Authentication (Google)
- **Data:** Cloud Firestore (profiles, relationships, events)
- **Live:** Firebase Realtime Database (presence + current location only)
- **Maps:** Leaflet + Carto Dark Matter tiles (OSM-compatible)
- **Geocoding:** Nominatim (configurable)

## Architecture

```
Firebase Auth
    │
    ▼
User Profile
    │
    ▼
Partner Relationship
    ├── Firestore → profiles, relationships, events, preferences, partnerCodes
    └── Realtime DB → presence, current location, partnerAccess mirror
```

Location history is intentionally **not** stored. Only the current location is published to Realtime Database while sharing is enabled.

## Local setup

```bash
npm install
cp .env.example .env
# fill Firebase + optional map/geocoder vars
npm run dev
```

## Environment variables

See `.env.example`:

| Variable | Purpose |
|----------|---------|
| `VITE_FIREBASE_*` | Firebase web config |
| `VITE_FIREBASE_DATABASE_URL` | Realtime Database URL |
| `VITE_MAP_TILE_URL` | Leaflet tile template |
| `VITE_MAP_ATTRIBUTION` | Required attribution HTML/text |
| `VITE_GEOCODER_URL` | Nominatim-compatible endpoint |
| `VITE_GEOCODER_USER_AGENT` | Identify your app to the geocoder |

## Firebase setup

1. Create a Firebase project.
2. Enable **Google** sign-in under Authentication.
3. Create a **Firestore** database.
4. Create a **Realtime Database**.
5. Add a Web app and copy config into `.env`.
6. Add your domain to Auth authorized domains (include `localhost` for dev).
7. Deploy security rules:

```bash
npm i -g firebase-tools
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules,database
```

### Google authentication

- Firebase Console → Authentication → Sign-in method → Google → Enable
- OAuth consent screen may be required for production Google Cloud projects

### Collections

- `users/{uid}` — profile, role, spider/suit, partner link, preferences
- `partnerCodes/{CODE}` — maps spider code → uid (lookup without scanning users)
- `relationships/{id}` — exactly two `memberIds`
- `relationships/{id}/events/{eventId}` — shared locations

### Realtime paths

- `presence/{uid}` — online flag, lastSeen, location sharing + coords
- `partnerAccess/{uid}/partnerId` — mirrors Firestore link so RTDB rules can authorize partner reads

## Security model

- Users read/write their own profile.
- Linked partners can read each other’s profiles.
- Unlinked, onboarded profiles are readable so partner codes can resolve (private couples app tradeoff).
- Relationship + events: members only.
- Presence location: only self and linked partner (via `partnerAccess` mirror).
- Location sharing defaults **OFF**.
- Never leave databases in test/open mode.

Rules files:

- `firestore.rules`
- `database.rules.json`

## Location privacy

- Sharing is explicit and toggleable.
- Precise location can be disabled (coords rounded ~1km).
- Disabling sharing clears published coordinates.
- No public location URLs, no history trail, no third-party analytics of GPS.
- Reverse geocoding only runs when the partner panel needs a city-level label.

## Map / geocoder notes

- Default tiles: Carto Dark Matter (respect their terms + OSM attribution).
- Nominatim: debounce, min query length, in-memory cache — do not hammer the public API.
- For heavy production traffic, run your own Nominatim or a commercial geocoder and point `VITE_GEOCODER_URL` at it.

## Scripts

```bash
npm run dev       # local development
npm run build     # production build
npm run preview   # preview build
npm run lint      # oxlint
```

## Adding assets

### Spider avatars

1. Add a definition in `src/data/spiders.ts`
2. Colors drive `src/assets/spiders/SpiderAvatar.tsx`
3. Optionally extend the SVG branches for unique silhouettes

### Suits

1. Add to `src/data/suits.ts` (`id`, colors, rarity, description)
2. Suit colors tint the shared spider avatar

### Event icons

1. Add to `src/data/events.ts`
2. Markers pick up emoji/color automatically

### UI sounds

Web Audio beeps live in `src/services/sound/audio.ts` (off by default). Extend `playSound()` names as needed — keep them original/synthesized.

## Deployment

1. Set production `.env` / hosting env vars
2. `npm run build`
3. Deploy `dist/` to Firebase Hosting, Vercel, Netlify, etc.
4. Add the production domain to Firebase Auth authorized domains
5. Deploy Firestore + RTDB rules

```bash
# Firebase Hosting example
firebase init hosting
firebase deploy
```

## Product routes

| Route | Purpose |
|-------|---------|
| `/` | Boot screen / auth redirect |
| `/login` | Sign-in |
| `/onboarding` | Role → spider → suit → name → link |
| `/tracker` | Main map HUD |
| `/settings` | Profile / privacy controls |

## Acceptance highlights

- Google login + themed errors
- Boyfriend/girlfriend role selection
- Original pixel spider/suit identity
- Partner codes (non-UID) + two-person link
- Realtime presence + throttled location sharing
- Shared events with pixel markers
- No movie/Samsung/commercial branding
- `MADE BY MANISH` watermark
- Reduce-motion + sound defaults respected

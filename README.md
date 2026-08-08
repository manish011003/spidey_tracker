# SPIDEY TRACKER

Private couples / friends web app with a homemade **pixel Spider HUD**: dark map, live presence, missions, quizzes, and spider-code invites.

**MADE BY MANISH** · `SPIDEY TRACKER // PRIVATE NETWORK`

Live (example): [spidey-tracker-pi.vercel.app](https://spidey-tracker-pi.vercel.app)

---

## Docs map

| Doc | Audience |
|-----|----------|
| **This README** | Setup, contribute, deploy |
| **[SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)** | HLD / LLD, schemas, sequences, privacy |
| **[.env.example](./.env.example)** | Required env vars |
| **`firestore.rules`** / **`database.rules.json`** | Security ACL |

New contributors: start here → skim architecture §1–2 → run local setup → pick a small HUD/feature PR.

---

## What it does

- Google sign-in → onboarding (role / spider / suit / name)
- **Partner** link (1:1) + **friends** with request accept/decline
- **Share spider code** (WhatsApp, Instagram copy+open, native share, clipboard)
- Dark Leaflet map: you, sharing partner/friends, events, **nearby landmark quests**
- Adventure: XP, levels, suits, quizzes, missions, achievements
- Privacy-first location (opt-in; friends ≠ location)

---

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | React 19, TypeScript, Vite, Tailwind 4, Leaflet |
| Auth | Firebase Authentication (Google) |
| Data | Cloud Firestore |
| Live | Firebase Realtime Database (presence / location / nudges) |
| Host | Vercel (static SPA) |
| Quests | Overpass API + local sector fallback |

Architecture diagram and store split → [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md).

---

## Quick start (contributors)

### Prerequisites

- Node.js 20+ (recommended)
- npm
- A Firebase project with Auth (Google), Firestore, and Realtime Database  
  **or** ask a maintainer for a shared `.env` for local work

### 1. Clone & install

```bash
git clone <repo-url>
cd spidy_tracker
npm install
cp .env.example .env
```

### 2. Fill `.env`

Copy values from Firebase Console → Project settings → Your apps → Web:

| Variable | Purpose |
|----------|---------|
| `VITE_FIREBASE_API_KEY` … `APP_ID` | Firebase web config |
| `VITE_FIREBASE_DATABASE_URL` | Realtime Database URL |
| `VITE_MAP_TILE_URL` / `ATTRIBUTION` | Leaflet tiles (defaults OK) |
| `VITE_GEOCODER_URL` / `USER_AGENT` | Nominatim (defaults OK) |

Never commit `.env`.

### 3. Run locally

```bash
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### 4. Before you open a PR

```bash
npm run lint
npm run build    # required — Vercel runs tsc -b && vite build
```

`npm run dev` alone does **not** catch all TypeScript errors. Always run `npm run build` before pushing.

---

## Project structure (where to edit)

```
src/
  pages/           # Route screens (Landing, Onboarding, Tracker…)
  components/
    tracker/       # HUD chrome, Find Spider, toolbar
    map/           # Leaflet map + markers
    adventure/     # Missions, quiz, friends, discoveries, dossier
    share/         # ShareCodeButtons (social invite)
    pixel/         # Buttons, modals, loaders — reuse these
  hooks/           # Presence, friends, location, nearby discoveries
  services/
    firebase/      # Auth, users, friends, adventure, presence…
    discoveries/   # Nearby POI quests
  data/            # Static catalogs (missions, quizzes, suits…)
  utils/           # Geo, progression, shareInvite, partner codes
  types/           # Shared TypeScript contracts
```

Full layout + module table → [SYSTEM_ARCHITECTURE.md §3](./SYSTEM_ARCHITECTURE.md).

---

## Contributing

### Workflow

1. Create a branch from `main` (`feat/…`, `fix/…`, `docs/…`).
2. Keep PRs small and focused.
3. Match the existing **pixel HUD** look — no generic dashboard redesigns.
4. Prefer extending `data/adventure.ts` / existing services over new backends.
5. Location features → Realtime Database presence only (no GPS history in Firestore).
6. If you touch peer-readable data → update **`firestore.rules`** and/or **`database.rules.json`** and note that in the PR.
7. Update **SYSTEM_ARCHITECTURE.md** when you change schemas or major flows.
8. Run `npm run build` + `npm run lint` before requesting review.

### Good first contributions

- New quiz questions / missions / achievements in `src/data/adventure.ts`
- Copy / UX polish in pixel panels (keep tone: uppercase HUD labels)
- Suit or spider catalog entries (`src/data/suits.ts`, `src/data/spiders.ts`)
- Docs and accessibility tweaks
- Bugfixes with a clear repro

### Design rules (short)

- Reuse `PixelButton`, `PixelModal`, CSS vars `--spidey-*`
- Sound stays **off by default**
- Privacy: friendship never implies location sharing
- Watermark / credit: **MADE BY MANISH** — do not add Marvel/Samsung branding

### PR checklist

- [ ] `npm run build` passes  
- [ ] `npm run lint` passes  
- [ ] No secrets in the diff  
- [ ] Rules updated + mentioned if ACL changed  
- [ ] Architecture doc touched if behavior/schema changed  

---

## Firebase setup (maintainers)

1. Create Firebase project → enable **Google** sign-in (and optionally **Phone**).  
2. Create **Firestore** + **Realtime Database**.  
3. Add Web app → copy config into `.env` / Vercel env.  
4. **Authorized domains:** `localhost`, your Vercel host (`*.vercel.app`).  
5. Google Cloud → **same project as Firebase** → Google Auth Platform / OAuth consent  
   - Audience **External**  
   - If **Testing**, add every Gmail as a test user (or publish the app)  
6. **Phone auth (optional):** Authentication → Sign-in method → **Phone** → Enable  
   - App uses invisible reCAPTCHA + SMS OTP on the boot screen  
   - Testing: add test phone numbers under Phone provider settings  
7. Deploy rules:

```bash
npx firebase-tools login
npx firebase-tools use spidy-tracker   # or your project id
npx firebase-tools deploy --only firestore:rules,database
```

Security model details → [SYSTEM_ARCHITECTURE.md §2.6 & §3.5](./SYSTEM_ARCHITECTURE.md).

---

## Deploy (Vercel)

1. Import the GitHub repo.  
2. Framework: **Vite**, output **`dist`**, build **`npm run build`**.  
3. Set all `VITE_FIREBASE_*` (and optional map/geocoder) env vars.  
4. Redeploy after any env change (Vite inlines env at build time).  
5. Add the production domain to Firebase Auth authorized domains.

`vercel.json` already includes SPA rewrite + COOP header for Google popup auth.

---

## Scripts

```bash
npm run dev       # local Vite
npm run build     # tsc -b && vite build (CI / Vercel)
npm run preview   # serve dist/
npm run lint      # oxlint
```

---

## Privacy (summary)

- Location sharing defaults **OFF**.  
- Disabling sharing clears published coords.  
- No location history trail.  
- Friends/partner can see profile; they only see the map pin if that user opts in.  

More → [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md).

---

## License / credit

Private project · **MADE BY MANISH**.  
Ask before redistributing or publishing a fork publicly.

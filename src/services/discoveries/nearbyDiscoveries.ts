import type { DiscoveryCategory, DiscoveryDef } from '../../data/adventure'
import { haversineDistanceKm } from '../../utils/geo'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const SEARCH_RADIUS_M = 2800
const MAX_NEARBY = 10

type OsmElement = {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

const CATEGORY_QUERIES: Array<{ category: DiscoveryCategory; filter: string; xp: number }> = [
  { category: 'park', filter: 'node["leisure"="park"]', xp: 70 },
  { category: 'cafe', filter: 'node["amenity"="cafe"]', xp: 55 },
  { category: 'temple', filter: 'node["amenity"="place_of_worship"]', xp: 85 },
  { category: 'mall', filter: 'node["shop"~"mall|department_store"]', xp: 65 },
  { category: 'landmark', filter: 'node["tourism"~"attraction|museum|viewpoint"]', xp: 80 },
]

const CLUES: Record<DiscoveryCategory, string[]> = {
  park: [
    'Green lungs of the city — follow the open grass signal…',
    'Where trees break the skyline, a web node waits…',
  ],
  cafe: [
    'Steam and chatter mark this corner hangout…',
    'Caffeine beacon — look for the busy public cafe…',
  ],
  temple: [
    'A place of worship hums with quiet energy…',
    'Follow the sacred public landmark nearby…',
  ],
  mall: [
    'Crowds and storefronts — a commercial hive…',
    'Indoor bazaar energy — find the shopping hub…',
  ],
  landmark: [
    'Tourists circle this attraction for a reason…',
    'A city landmark pings on your spider-sense…',
  ],
  other: ['A faint public signal nearby…'],
}

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function cellSeed(lat: number, lng: number): number {
  // ~1.1km cells — discoveries reshuffle as you travel to a new sector
  const a = Math.round(lat * 100)
  const b = Math.round(lng * 100)
  return (a * 73856093) ^ (b * 19349663) ^ 0x51de01
}

function offsetLatLng(
  lat: number,
  lng: number,
  distanceM: number,
  bearingDeg: number,
): { lat: number; lng: number } {
  const R = 6371000
  const δ = distanceM / R
  const θ = (bearingDeg * Math.PI) / 180
  const φ1 = (lat * Math.PI) / 180
  const λ1 = (lng * Math.PI) / 180
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ))
  const λ2 =
    λ1 +
    Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2))
  return { lat: (φ2 * 180) / Math.PI, lng: (λ2 * 180) / Math.PI }
}

function pickClue(category: DiscoveryCategory, salt: number): string {
  const list = CLUES[category] ?? CLUES.other
  return list[salt % list.length] ?? CLUES.other[0]
}

/** Deterministic nearby quests when OSM is unavailable — always within a few km. */
export function generateLocalDiscoveries(lat: number, lng: number): DiscoveryDef[] {
  const rand = mulberry32(cellSeed(lat, lng) >>> 0)
  const cats: DiscoveryCategory[] = ['park', 'cafe', 'temple', 'mall', 'landmark', 'park', 'cafe', 'landmark']
  const out: DiscoveryDef[] = []

  for (let i = 0; i < cats.length; i++) {
    const category = cats[i]
    const dist = 450 + rand() * 2000 // 0.45–2.45 km
    const bearing = (rand() * 360 + i * 47) % 360
    const pos = offsetLatLng(lat, lng, dist, bearing)
    const xp = category === 'temple' ? 85 : category === 'landmark' ? 80 : category === 'park' ? 70 : 55
    out.push({
      id: `sector-${Math.round(lat * 100)}-${Math.round(lng * 100)}-${i}-${category}`,
      name: `${category.toUpperCase()} WEB NODE`,
      clue: pickClue(category, Math.floor(rand() * 100)),
      category,
      latitude: pos.lat,
      longitude: pos.lng,
      radiusM: category === 'park' ? 220 : 160,
      xp,
      unlockSuit: category === 'landmark' && i === 4 ? 'neon' : undefined,
    })
  }
  return out
}

function osmToDiscovery(el: OsmElement, category: DiscoveryCategory, xp: number): DiscoveryDef | null {
  const lat = el.lat ?? el.center?.lat
  const lon = el.lon ?? el.center?.lon
  if (lat == null || lon == null) return null
  const name = (el.tags?.name || el.tags?.['name:en'] || `${category.toUpperCase()} SIGNAL`).toUpperCase()
  return {
    id: `osm-${el.type}-${el.id}`,
    name: name.slice(0, 28),
    clue: pickClue(category, el.id),
    category,
    latitude: lat,
    longitude: lon,
    radiusM: category === 'park' ? 240 : 150,
    xp,
  }
}

async function queryOverpass(lat: number, lng: number): Promise<DiscoveryDef[]> {
  const filters = CATEGORY_QUERIES.map(
    (c) => `${c.filter}(around:${SEARCH_RADIUS_M},${lat},${lng});`,
  ).join('\n  ')

  const query = `
[out:json][timeout:18];
(
  ${filters}
);
out center 30;
`.trim()

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      Accept: 'application/json',
    },
    body: `data=${encodeURIComponent(query)}`,
  })
  if (!res.ok) throw new Error('OVERPASS UNAVAILABLE')

  const data = (await res.json()) as { elements?: OsmElement[] }
  const elements = data.elements ?? []
  const byCat = new Map<DiscoveryCategory, DiscoveryDef[]>()

  for (const el of elements) {
    const tags = el.tags ?? {}
    let category: DiscoveryCategory = 'other'
    let xp = 60
    if (tags.leisure === 'park') {
      category = 'park'
      xp = 70
    } else if (tags.amenity === 'cafe') {
      category = 'cafe'
      xp = 55
    } else if (tags.amenity === 'place_of_worship') {
      category = 'temple'
      xp = 85
    } else if (tags.shop === 'mall' || tags.shop === 'department_store') {
      category = 'mall'
      xp = 65
    } else if (tags.tourism) {
      category = 'landmark'
      xp = 80
    }
    const d = osmToDiscovery(el, category, xp)
    if (!d) continue
    const list = byCat.get(category) ?? []
    list.push(d)
    byCat.set(category, list)
  }

  // Round-robin pick for variety, prefer closer
  const buckets = [...byCat.values()].map((list) =>
    list.sort(
      (a, b) =>
        haversineDistanceKm(lat, lng, a.latitude, a.longitude) -
        haversineDistanceKm(lat, lng, b.latitude, b.longitude),
    ),
  )

  const picked: DiscoveryDef[] = []
  let i = 0
  while (picked.length < MAX_NEARBY && buckets.some((b) => b.length > 0)) {
    const bucket = buckets[i % buckets.length]
    const next = bucket.shift()
    if (next && !picked.some((p) => p.id === next.id)) picked.push(next)
    i++
  }

  return picked.sort(
    (a, b) =>
      haversineDistanceKm(lat, lng, a.latitude, a.longitude) -
      haversineDistanceKm(lat, lng, b.latitude, b.longitude),
  )
}

/**
 * Dynamic discoveries near the user. Tries real public OSM places, falls back
 * to seeded local web-nodes in the same sector (~few km).
 */
export async function getNearbyDiscoveries(lat: number, lng: number): Promise<DiscoveryDef[]> {
  try {
    const osm = await queryOverpass(lat, lng)
    if (osm.length >= 3) return osm
    // Sparse area — mix OSM + procedural
    const local = generateLocalDiscoveries(lat, lng)
    const ids = new Set(osm.map((d) => d.id))
    return [...osm, ...local.filter((d) => !ids.has(d.id))].slice(0, MAX_NEARBY)
  } catch {
    return generateLocalDiscoveries(lat, lng)
  }
}

export function sortDiscoveriesByDistance(
  discoveries: DiscoveryDef[],
  lat: number,
  lng: number,
): Array<DiscoveryDef & { distanceM: number }> {
  return discoveries
    .map((d) => ({
      ...d,
      distanceM: Math.round(haversineDistanceKm(lat, lng, d.latitude, d.longitude) * 1000),
    }))
    .sort((a, b) => a.distanceM - b.distanceM)
}

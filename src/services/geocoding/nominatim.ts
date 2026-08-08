import type { GeocodeResult } from '../../types'

const BASE_URL =
  (import.meta.env.VITE_GEOCODER_URL as string | undefined) ??
  'https://nominatim.openstreetmap.org'
const USER_AGENT =
  (import.meta.env.VITE_GEOCODER_USER_AGENT as string | undefined) ??
  'SpideyTracker/1.0 (private couples app)'

const cache = new Map<string, { at: number; results: GeocodeResult[] }>()
const CACHE_TTL = 5 * 60_000

function headers(): HeadersInit {
  return {
    Accept: 'application/json',
    'User-Agent': USER_AGENT,
  }
}

export async function searchLocations(query: string): Promise<GeocodeResult[]> {
  const q = query.trim()
  if (q.length < 3) return []

  const cached = cache.get(q.toLowerCase())
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return cached.results
  }

  const url = new URL(`${BASE_URL}/search`)
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'json')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '5')

  const res = await fetch(url.toString(), { headers: headers() })
  if (!res.ok) throw new Error('GEOCODER UNAVAILABLE')

  const data = (await res.json()) as Array<{
    display_name: string
    lat: string
    lon: string
    address?: { city?: string; town?: string; village?: string; country?: string }
  }>

  const results: GeocodeResult[] = data.map((item) => ({
    displayName: item.display_name,
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    city: item.address?.city ?? item.address?.town ?? item.address?.village,
    country: item.address?.country,
  }))

  cache.set(q.toLowerCase(), { at: Date.now(), results })
  return results
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`
  const cached = cache.get(`rev:${key}`)
  if (cached && Date.now() - cached.at < CACHE_TTL && cached.results[0]) {
    return cached.results[0].city ?? cached.results[0].displayName
  }

  const url = new URL(`${BASE_URL}/reverse`)
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('format', 'json')
  url.searchParams.set('zoom', '10')

  const res = await fetch(url.toString(), { headers: headers() })
  if (!res.ok) return 'UNKNOWN SECTOR'

  const data = (await res.json()) as {
    display_name?: string
    address?: { city?: string; town?: string; village?: string; state?: string; country?: string }
  }

  const city =
    data.address?.city ??
    data.address?.town ??
    data.address?.village ??
    data.address?.state ??
    'UNKNOWN SECTOR'

  const area = data.address?.country ? `${city}, ${data.address.country}` : city
  cache.set(`rev:${key}`, {
    at: Date.now(),
    results: [{ displayName: area, latitude: lat, longitude: lng, city }],
  })
  return area
}

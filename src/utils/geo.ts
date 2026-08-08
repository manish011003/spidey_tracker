const EARTH_RADIUS_KM = 6371

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} M`
  if (km < 100) return `${km.toFixed(1)} KM`
  return `${Math.round(km).toLocaleString()} KM`
}

/** Round coordinates for approximate (non-precise) sharing (~1.1km). */
export function approximateCoords(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
  }
}

export function formatRelativeTime(
  timestamp: number | null | undefined,
  now: number = Date.now(),
): string {
  if (!timestamp) return 'NO SIGNAL'
  const seconds = Math.floor((now - timestamp) / 1000)
  if (seconds < 5) return 'JUST NOW'
  if (seconds < 60) return `${seconds} SEC AGO`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} MIN AGO`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} HR AGO`
  const days = Math.floor(hours / 24)
  return `${days} DAY${days === 1 ? '' : 'S'} AGO`
}

/** Short map label: LIVE under 15s, else LAST SIGNAL age, or SIGNAL WEAK. */
export function formatSignalLabel(
  timestamp: number | null | undefined,
  opts: { weak?: boolean; now?: number } = {},
): string {
  const now = opts.now ?? Date.now()
  if (!timestamp) return 'NO SIGNAL'
  if (opts.weak) return `SIGNAL WEAK · ${formatRelativeTime(timestamp, now)}`
  const age = now - timestamp
  if (age < 15_000) return 'LIVE'
  return `LAST SIGNAL: ${formatRelativeTime(timestamp, now)}`
}

export function getPresenceStatus(
  online: boolean,
  lastSeen: number | null | undefined,
  now: number = Date.now(),
): 'online' | 'fading' | 'offline' {
  if (!lastSeen) return 'offline'
  const age = now - lastSeen
  if (online && age < 45_000) return 'online'
  if (age < 5 * 60_000) return 'fading'
  return 'offline'
}

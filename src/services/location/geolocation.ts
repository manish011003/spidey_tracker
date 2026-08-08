export type GeoPosition = {
  latitude: number
  longitude: number
  accuracy: number | null
  heading: number | null
  speed: number | null
  timestamp: number
}

export function isGeolocationAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator
}

export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationAvailable()) {
      reject(new Error('GEOLOCATION UNAVAILABLE'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          heading: pos.coords.heading ?? null,
          speed: pos.coords.speed ?? null,
          timestamp: pos.timestamp,
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('LOCATION PERMISSION DENIED'))
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new Error('LOCATION UNAVAILABLE'))
        } else {
          reject(new Error('LOCATION TIMEOUT'))
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    )
  })
}

export function watchPosition(
  onUpdate: (pos: GeoPosition) => void,
  onError?: (message: string) => void,
): () => void {
  if (!isGeolocationAvailable()) {
    onError?.('GEOLOCATION UNAVAILABLE')
    return () => undefined
  }

  const id = navigator.geolocation.watchPosition(
    (pos) => {
      onUpdate({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
        heading: pos.coords.heading ?? null,
        speed: pos.coords.speed ?? null,
        timestamp: pos.timestamp,
      })
    },
    (err) => {
      if (err.code === err.PERMISSION_DENIED) onError?.('LOCATION PERMISSION DENIED')
      else onError?.('LOCATION SIGNAL WEAK')
    },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 },
  )

  return () => navigator.geolocation.clearWatch(id)
}

/** Returns true if movement is significant enough to publish. */
export function hasMovedSignificantly(
  prev: { lat: number; lng: number } | null,
  next: { lat: number; lng: number },
  minMeters = 25,
): boolean {
  if (!prev) return true
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(next.lat - prev.lat)
  const dLon = toRad(next.lng - prev.lng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(prev.lat)) * Math.cos(toRad(next.lat)) * Math.sin(dLon / 2) ** 2
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return dist >= minMeters
}

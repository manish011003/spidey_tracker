import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getCurrentPosition,
  hasMovedSignificantly,
  watchPosition,
  type GeoPosition,
} from '../services/location/geolocation'
import { publishLocation, setLocationSharing } from '../services/firebase/presence'
import { updatePreferences } from '../services/firebase/users'
import { approximateCoords } from '../utils/geo'
import { isFirebaseConfigured } from '../services/firebase/config'
import type { UserPreferences } from '../types'

const MIN_PUBLISH_MS = 8000

export function useLocationSharing(
  uid: string | undefined,
  preferences: UserPreferences | undefined,
) {
  const [error, setError] = useState<string | null>(null)
  const [lastLocal, setLastLocal] = useState<GeoPosition | null>(null)
  const lastPublished = useRef<{ lat: number; lng: number; at: number } | null>(null)
  const sharing = preferences?.locationSharingEnabled ?? false
  const precise = preferences?.preciseLocationEnabled ?? true

  const publish = useCallback(
    async (pos: GeoPosition, enabled: boolean, preciseLoc: boolean) => {
      if (!uid || !isFirebaseConfigured) return
      const coords = preciseLoc
        ? { lat: pos.latitude, lng: pos.longitude }
        : approximateCoords(pos.latitude, pos.longitude)

      const prev = lastPublished.current
      const moved = hasMovedSignificantly(
        prev ? { lat: prev.lat, lng: prev.lng } : null,
        coords,
        preciseLoc ? 25 : 80,
      )
      const stale = !prev || Date.now() - prev.at > MIN_PUBLISH_MS
      if (!moved && !stale) return

      await publishLocation(uid, {
        latitude: coords.lat,
        longitude: coords.lng,
        accuracy: pos.accuracy,
        heading: pos.heading,
        speed: pos.speed,
        locationSharingEnabled: enabled,
        preciseLocationEnabled: preciseLoc,
      })
      lastPublished.current = { lat: coords.lat, lng: coords.lng, at: Date.now() }
      setLastLocal(pos)
    },
    [uid],
  )

  useEffect(() => {
    if (!uid || !sharing || !isFirebaseConfigured) return

    let stopWatch: (() => void) | undefined
    let intervalId: number | undefined

    void (async () => {
      try {
        const pos = await getCurrentPosition()
        await publish(pos, true, precise)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'LOCATION ERROR')
      }

      stopWatch = watchPosition(
        (pos) => {
          void publish(pos, true, precise)
        },
        (msg) => setError(msg),
      )

      intervalId = window.setInterval(() => {
        void getCurrentPosition()
          .then((pos) => publish(pos, true, precise))
          .catch(() => undefined)
      }, 30_000)
    })()

    return () => {
      stopWatch?.()
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [uid, sharing, precise, publish])

  const setSharing = useCallback(
    async (enabled: boolean) => {
      if (!uid) return
      setError(null)
      try {
        await updatePreferences(uid, { locationSharingEnabled: enabled })
        await setLocationSharing(uid, enabled, precise)
        if (enabled) {
          const pos = await getCurrentPosition()
          await publish(pos, true, precise)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'LOCATION ERROR')
      }
    },
    [uid, precise, publish],
  )

  const setPrecise = useCallback(
    async (value: boolean) => {
      if (!uid) return
      await updatePreferences(uid, { preciseLocationEnabled: value })
      await setLocationSharing(uid, sharing, value)
      if (sharing) {
        const pos = await getCurrentPosition()
        await publish(pos, true, value)
      }
    },
    [uid, sharing, publish],
  )

  return { sharing, precise, error, lastLocal, setSharing, setPrecise, clearError: () => setError(null) }
}

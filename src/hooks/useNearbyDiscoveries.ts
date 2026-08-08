import { useEffect, useState } from 'react'
import type { DiscoveryDef } from '../data/adventure'
import { getCurrentPosition } from '../services/location/geolocation'
import {
  generateLocalDiscoveries,
  getNearbyDiscoveries,
} from '../services/discoveries/nearbyDiscoveries'

type State = {
  discoveries: DiscoveryDef[]
  loading: boolean
  source: 'osm' | 'local' | 'none'
  error: string | null
  lat: number | null
  lng: number | null
}

function sectorKeyOf(lat: number, lng: number) {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`
}

/**
 * Loads quest / discovery landmarks near the user.
 * Prefers live presence / shared coords; falls back to a one-shot GPS fix
 * (local only — not published) so the board stays near you.
 * Resets when they move to a new ~1km sector.
 */
export function useNearbyDiscoveries(lat: number | null, lng: number | null) {
  const [anchor, setAnchor] = useState<{ lat: number; lng: number; key: string } | null>(
    lat != null && lng != null
      ? { lat, lng, key: sectorKeyOf(lat, lng) }
      : null,
  )
  const [state, setState] = useState<State>({
    discoveries: [],
    loading: false,
    source: 'none',
    error: null,
    lat: null,
    lng: null,
  })

  useEffect(() => {
    if (lat != null && lng != null) {
      const key = sectorKeyOf(lat, lng)
      setAnchor((prev) => {
        if (prev?.key === key) return prev
        return { lat, lng, key }
      })
      return
    }

    let cancelled = false
    void getCurrentPosition()
      .then((pos) => {
        if (cancelled) return
        const key = sectorKeyOf(pos.latitude, pos.longitude)
        setAnchor((prev) => {
          if (prev?.key === key) return prev
          return { lat: pos.latitude, lng: pos.longitude, key }
        })
      })
      .catch(() => {
        if (!cancelled) {
          setAnchor((prev) => prev)
        }
      })

    return () => {
      cancelled = true
    }
  }, [lat, lng])

  useEffect(() => {
    if (!anchor) {
      setState({
        discoveries: [],
        loading: false,
        source: 'none',
        error: null,
        lat: null,
        lng: null,
      })
      return
    }

    const { lat: aLat, lng: aLng } = anchor
    let cancelled = false
    setState((s) => ({
      ...s,
      loading: true,
      error: null,
      lat: aLat,
      lng: aLng,
      discoveries: generateLocalDiscoveries(aLat, aLng),
      source: 'local',
    }))

    void getNearbyDiscoveries(aLat, aLng)
      .then((list) => {
        if (cancelled) return
        const fromOsm = list.some((d) => d.id.startsWith('osm-'))
        setState({
          discoveries: list,
          loading: false,
          source: fromOsm ? 'osm' : 'local',
          error: null,
          lat: aLat,
          lng: aLng,
        })
      })
      .catch(() => {
        if (cancelled) return
        setState({
          discoveries: generateLocalDiscoveries(aLat, aLng),
          loading: false,
          source: 'local',
          error: null,
          lat: aLat,
          lng: aLng,
        })
      })

    return () => {
      cancelled = true
    }
  }, [anchor])

  return state
}

import { useEffect, useState } from 'react'
import type { SharedEvent } from '../types'
import { subscribeToEvents, createEvent, type EventInput } from '../services/firebase/events'
import { isFirebaseConfigured } from '../services/firebase/config'
import { playSound } from '../services/sound/audio'

export function useEvents(relationshipId: string | null | undefined) {
  const [events, setEvents] = useState<SharedEvent[]>([])
  const [loading, setLoading] = useState(Boolean(relationshipId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!relationshipId || !isFirebaseConfigured) {
      setEvents([])
      setLoading(false)
      return
    }
    setLoading(true)
    return subscribeToEvents(
      relationshipId,
      (next) => {
        setEvents(next)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
  }, [relationshipId])

  const addEvent = async (input: EventInput) => {
    if (!relationshipId) throw new Error('NO RELATIONSHIP')
    const id = await createEvent(relationshipId, input)
    playSound('event')
    return id
  }

  return { events, loading, error, addEvent }
}

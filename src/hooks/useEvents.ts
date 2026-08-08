import { useEffect, useMemo, useState } from 'react'
import type { SharedEvent } from '../types'
import {
  createMapEvent,
  deleteSharedEvent,
  subscribeToEveryoneEvents,
  subscribeToRelationshipEvents,
  subscribeToVisibleToEvents,
  type EventInput,
} from '../services/firebase/events'
import { isFirebaseConfigured } from '../services/firebase/config'
import { playSound } from '../services/sound/audio'

function mergeEvents(...lists: SharedEvent[][]): SharedEvent[] {
  const byId = new Map<string, SharedEvent>()
  for (const list of lists) {
    for (const ev of list) {
      const key = `${ev.storage ?? 'map'}:${ev.id}`
      byId.set(key, ev)
    }
  }
  return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt)
}

export function useEvents(uid: string | null | undefined, relationshipId?: string | null) {
  const [everyone, setEveryone] = useState<SharedEvent[]>([])
  const [mine, setMine] = useState<SharedEvent[]>([])
  const [legacy, setLegacy] = useState<SharedEvent[]>([])
  const [loading, setLoading] = useState(Boolean(uid))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!uid || !isFirebaseConfigured) {
      setEveryone([])
      setMine([])
      setLegacy([])
      setLoading(false)
      return
    }

    setLoading(true)
    let gotEveryone = false
    let gotMine = false
    let gotLegacy = !relationshipId

    const check = () => {
      if (gotEveryone && gotMine && gotLegacy) setLoading(false)
    }

    const unsubs = [
      subscribeToEveryoneEvents(
        (next) => {
          setEveryone(next)
          gotEveryone = true
          check()
        },
        (err) => {
          console.warn('[events] everyone query', err)
          setError(err.message)
          gotEveryone = true
          check()
        },
      ),
      subscribeToVisibleToEvents(
        uid,
        (next) => {
          setMine(next)
          gotMine = true
          check()
        },
        (err) => {
          console.warn('[events] visibleTo query', err)
          setError(err.message)
          gotMine = true
          check()
        },
      ),
    ]

    if (relationshipId) {
      unsubs.push(
        subscribeToRelationshipEvents(
          relationshipId,
          (next) => {
            setLegacy(next)
            gotLegacy = true
            check()
          },
          (err) => {
            console.warn('[events] relationship query', err)
            gotLegacy = true
            check()
          },
        ),
      )
    } else {
      setLegacy([])
    }

    return () => {
      for (const u of unsubs) u()
    }
  }, [uid, relationshipId])

  const events = useMemo(
    () => mergeEvents(everyone, mine, legacy),
    [everyone, mine, legacy],
  )

  const addEvent = async (input: EventInput) => {
    if (!uid) throw new Error('NOT SIGNED IN')
    const id = await createMapEvent({ ...input, createdBy: uid })
    playSound('event')
    return id
  }

  const removeEvent = async (event: SharedEvent) => {
    if (!uid || event.createdBy !== uid) throw new Error('ONLY THE CREATOR CAN DELETE')
    await deleteSharedEvent(event)
    playSound('signal')
  }

  return { events, loading, error, addEvent, removeEvent }
}

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import type { EventIcon, SharedEvent } from '../../types'
import { requireDb } from './config'

function toMillis(value: unknown): number {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'toMillis' in value) {
    return (value as Timestamp).toMillis()
  }
  return Date.now()
}

export type EventInput = {
  title: string
  description: string
  latitude: number
  longitude: number
  locationName: string
  date: string
  icon: EventIcon
  color?: string
  createdBy: string
}

export function subscribeToEvents(
  relationshipId: string,
  callback: (events: SharedEvent[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const db = requireDb()
  const q = query(
    collection(db, 'relationships', relationshipId, 'events'),
    orderBy('createdAt', 'desc'),
  )

  return onSnapshot(
    q,
    (snap) => {
      const events = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          title: data.title as string,
          description: (data.description as string) ?? '',
          latitude: data.latitude as number,
          longitude: data.longitude as number,
          locationName: (data.locationName as string) ?? '',
          date: (data.date as string) ?? '',
          icon: data.icon as EventIcon,
          color: data.color as string | undefined,
          createdBy: data.createdBy as string,
          createdAt: toMillis(data.createdAt),
          updatedAt: toMillis(data.updatedAt),
        } satisfies SharedEvent
      })
      callback(events)
    },
    (err) => onError?.(err),
  )
}

export async function createEvent(
  relationshipId: string,
  input: EventInput,
): Promise<string> {
  const db = requireDb()
  const ref = await addDoc(collection(db, 'relationships', relationshipId, 'events'), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateEvent(
  relationshipId: string,
  eventId: string,
  fields: Partial<EventInput>,
): Promise<void> {
  const db = requireDb()
  await updateDoc(doc(db, 'relationships', relationshipId, 'events', eventId), {
    ...fields,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteEvent(relationshipId: string, eventId: string): Promise<void> {
  const db = requireDb()
  await deleteDoc(doc(db, 'relationships', relationshipId, 'events', eventId))
}

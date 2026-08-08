import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import type { EventIcon, EventVisibility, SharedEvent } from '../../types'
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
  visibility: EventVisibility
  /** Friend UIDs to include when visibility === 'friends' (creator added automatically). */
  friendIds?: string[]
}

function mapEventDoc(
  id: string,
  data: Record<string, unknown>,
  storage: 'map' | 'relationship',
  relationshipId?: string,
): SharedEvent {
  const visibility = (data.visibility as EventVisibility | undefined) ?? undefined
  const visibleTo = Array.isArray(data.visibleTo)
    ? (data.visibleTo as string[])
    : undefined
  return {
    id,
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
    visibility: storage === 'relationship' ? visibility ?? 'friends' : visibility ?? 'everyone',
    visibleTo,
    storage,
    relationshipId,
  }
}

/** Legacy partner-shared events under relationships/{id}/events */
export function subscribeToRelationshipEvents(
  relationshipId: string,
  callback: (events: SharedEvent[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = requireDb()
  const q = query(
    collection(db, 'relationships', relationshipId, 'events'),
    orderBy('createdAt', 'desc'),
  )

  return onSnapshot(
    q,
    (snap) => {
      callback(
        snap.docs.map((d) =>
          mapEventDoc(d.id, d.data() as Record<string, unknown>, 'relationship', relationshipId),
        ),
      )
    },
    (err) => onError?.(err),
  )
}

/** Platform events visible to everyone */
export function subscribeToEveryoneEvents(
  callback: (events: SharedEvent[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = requireDb()
  const q = query(
    collection(db, 'mapEvents'),
    where('visibility', '==', 'everyone'),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => mapEventDoc(d.id, d.data() as Record<string, unknown>, 'map')))
    },
    (err) => onError?.(err),
  )
}

/** Events where this uid is in visibleTo (own + invited friends) */
export function subscribeToVisibleToEvents(
  uid: string,
  callback: (events: SharedEvent[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = requireDb()
  const q = query(
    collection(db, 'mapEvents'),
    where('visibleTo', 'array-contains', uid),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => mapEventDoc(d.id, d.data() as Record<string, unknown>, 'map')))
    },
    (err) => onError?.(err),
  )
}

export async function createMapEvent(input: EventInput): Promise<string> {
  const db = requireDb()
  const visibleTo =
    input.visibility === 'everyone'
      ? [input.createdBy]
      : Array.from(new Set([input.createdBy, ...(input.friendIds ?? [])]))

  if (input.visibility === 'friends' && visibleTo.length < 2) {
    throw new Error('PICK AT LEAST ONE FRIEND')
  }

  const ref = await addDoc(collection(db, 'mapEvents'), {
    title: input.title,
    description: input.description,
    latitude: input.latitude,
    longitude: input.longitude,
    locationName: input.locationName,
    date: input.date,
    icon: input.icon,
    color: input.color ?? null,
    createdBy: input.createdBy,
    visibility: input.visibility,
    visibleTo,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function deleteMapEvent(eventId: string): Promise<void> {
  const db = requireDb()
  await deleteDoc(doc(db, 'mapEvents', eventId))
}

export async function deleteRelationshipEvent(
  relationshipId: string,
  eventId: string,
): Promise<void> {
  const db = requireDb()
  await deleteDoc(doc(db, 'relationships', relationshipId, 'events', eventId))
}

export async function deleteSharedEvent(event: SharedEvent): Promise<void> {
  if (event.storage === 'relationship' && event.relationshipId) {
    await deleteRelationshipEvent(event.relationshipId, event.id)
    return
  }
  await deleteMapEvent(event.id)
}

/** @deprecated — use createMapEvent */
export async function createEvent(
  relationshipId: string,
  input: Omit<EventInput, 'visibility' | 'friendIds'> & { createdBy: string },
): Promise<string> {
  const db = requireDb()
  const ref = await addDoc(collection(db, 'relationships', relationshipId, 'events'), {
    title: input.title,
    description: input.description,
    latitude: input.latitude,
    longitude: input.longitude,
    locationName: input.locationName,
    date: input.date,
    icon: input.icon,
    color: input.color ?? null,
    createdBy: input.createdBy,
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
  await deleteRelationshipEvent(relationshipId, eventId)
}

/** Back-compat alias */
export const subscribeToEvents = subscribeToRelationshipEvents

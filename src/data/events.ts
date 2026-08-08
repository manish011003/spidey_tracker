import type { EventIcon } from '../types'

export interface EventIconDef {
  id: EventIcon
  label: string
  emoji: string
  color: string
}

export const EVENT_ICONS: EventIconDef[] = [
  { id: 'heart', label: 'DATE', emoji: '♥', color: '#FF5252' },
  { id: 'home', label: 'HOME', emoji: '⌂', color: '#FFA726' },
  { id: 'star', label: 'SPECIAL', emoji: '★', color: '#FFEE58' },
  { id: 'travel', label: 'TRAVEL', emoji: '✈', color: '#42A5F5' },
  { id: 'birthday', label: 'BIRTHDAY', emoji: '✦', color: '#EC407A' },
  { id: 'cafe', label: 'CAFE', emoji: '☕', color: '#8D6E63' },
  { id: 'custom', label: 'CUSTOM', emoji: '●', color: '#26C6DA' },
  { id: 'spider', label: 'SPIDER', emoji: '🕷', color: '#EF5350' },
]

export function getEventIcon(id: EventIcon): EventIconDef {
  return EVENT_ICONS.find((e) => e.id === id) ?? EVENT_ICONS[0]
}

import type { SpiderDefinition } from '../types'

export const SPIDERS: SpiderDefinition[] = [
  {
    id: 'classic',
    name: 'CLASSIC SPIDER',
    description: 'The original web-slinger. Red, blue, and ready.',
    primaryColor: '#E53935',
    secondaryColor: '#1565C0',
  },
  {
    id: 'black',
    name: 'BLACK SPIDER',
    description: 'Shadow-woven suit. Moves like night itself.',
    primaryColor: '#1A1A1A',
    secondaryColor: '#CFD8DC',
  },
  {
    id: 'scarlet',
    name: 'SCARLET SPIDER',
    description: 'Crimson energy. Hot-tempered heroics.',
    primaryColor: '#FF1744',
    secondaryColor: '#212121',
  },
  {
    id: 'noir',
    name: 'SPIDER NOIR',
    description: 'Hard-boiled detective from a rain-soaked era.',
    primaryColor: '#263238',
    secondaryColor: '#F5F5F5',
  },
  {
    id: 'iron',
    name: 'IRON SPIDER',
    description: 'Tech-enhanced webbing and gold plating.',
    primaryColor: '#C62828',
    secondaryColor: '#FFD600',
  },
  {
    id: 'future',
    name: 'FUTURE SPIDER',
    description: 'Tomorrow\'s spider. Advanced web tech.',
    primaryColor: '#00BCD4',
    secondaryColor: '#311B92',
  },
  {
    id: 'neon',
    name: 'NEON SPIDER',
    description: 'Glows in the dark. City nights preferred.',
    primaryColor: '#00E676',
    secondaryColor: '#AA00FF',
  },
  {
    id: 'mystery',
    name: 'MYSTERY SPIDER',
    description: '??? — Unlock by linking your partner.',
    primaryColor: '#7B1FA2',
    secondaryColor: '#FFD54F',
    locked: true,
  },
]

export function getSpider(id: string): SpiderDefinition {
  return SPIDERS.find((s) => s.id === id) ?? SPIDERS[0]
}

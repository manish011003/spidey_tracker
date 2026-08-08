import type { SuitDefinition } from '../types'

export const SUITS: SuitDefinition[] = [
  {
    id: 'classic',
    name: 'CLASSIC',
    description: 'Classic male Spidey — red & blue web-slinger.',
    rarity: 'common',
    primaryColor: '#E53935',
    secondaryColor: '#1565C0',
    accentColor: '#FFFFFF',
  },
  {
    id: 'ghost',
    name: 'GHOST',
    description: 'Girl Spidey — white hood, pink web accents.',
    rarity: 'legendary',
    primaryColor: '#F5F5F5',
    secondaryColor: '#EC407A',
    accentColor: '#18FFFF',
  },
  {
    id: 'black',
    name: 'BLACK',
    description: 'Shadow-woven suit. Moves like night itself.',
    rarity: 'rare',
    primaryColor: '#111111',
    secondaryColor: '#E53935',
    accentColor: '#FFFFFF',
  },
  {
    id: 'scarlet',
    name: 'SCARLET',
    description: 'Crimson body, black cowl. Hot-tempered heroics.',
    rarity: 'rare',
    primaryColor: '#D50000',
    secondaryColor: '#212121',
    accentColor: '#FF8A80',
  },
  {
    id: 'noir',
    name: 'NOIR',
    description: 'Fedora, trench coat, rain-soaked streets.',
    rarity: 'epic',
    primaryColor: '#37474F',
    secondaryColor: '#FAFAFA',
    accentColor: '#90A4AE',
  },
  {
    id: 'iron',
    name: 'IRON',
    description: 'Nanotech plating with gold trim.',
    rarity: 'epic',
    primaryColor: '#B71C1C',
    secondaryColor: '#FFC107',
    accentColor: '#FFF59D',
  },
  {
    id: 'future',
    name: 'FUTURE',
    description: "Tomorrow's spider. Blue armor, red skull-web.",
    rarity: 'epic',
    primaryColor: '#0D47A1',
    secondaryColor: '#E53935',
    accentColor: '#82B1FF',
  },
  {
    id: 'america',
    name: 'AMERICA',
    description: 'Stars, stripes, and spider sense.',
    rarity: 'legendary',
    primaryColor: '#1565C0',
    secondaryColor: '#E53935',
    accentColor: '#FFFFFF',
  },
  {
    id: 'stealth',
    name: 'STEALTH',
    description: 'Red mask, black chassis. Infiltration ready.',
    rarity: 'rare',
    primaryColor: '#B71C1C',
    secondaryColor: '#111111',
    accentColor: '#FFFFFF',
  },
  {
    id: 'neon',
    name: 'NEON',
    description: 'Electric nights. High visibility optional.',
    rarity: 'epic',
    primaryColor: '#00E676',
    secondaryColor: '#D500F9',
    accentColor: '#18FFFF',
  },
]

export function getSuit(id: string): SuitDefinition {
  const normalized = id === 'mystery' ? 'ghost' : id
  return SUITS.find((s) => s.id === normalized) ?? SUITS[0]
}

export const RARITY_COLORS: Record<SuitDefinition['rarity'], string> = {
  common: '#90A4AE',
  rare: '#42A5F5',
  epic: '#AB47BC',
  legendary: '#FFD54F',
}

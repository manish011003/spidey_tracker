import { useMemo } from 'react'
import { PixelModal } from '../pixel/PixelModal'
import { PixelButton } from '../pixel/PixelButton'
import type { UserProfile } from '../../types'
import { MISSIONS, type MissionCategory } from '../../data/adventure'
import { normalizeAdventure } from '../../services/firebase/adventure'
import { playSound } from '../../services/sound/audio'

type Props = {
  open: boolean
  profile: UserProfile
  onClose: () => void
  onOpenQuiz: () => void
  onOpenDiscoveries: () => void
}

const CAT_COLOR: Record<MissionCategory, string> = {
  daily: 'var(--spidey-orange)',
  weekly: 'var(--spidey-yellow)',
  exploration: 'var(--spidey-green)',
  social: 'var(--spidey-cyan)',
  quiz: '#AB47BC',
  discovery: 'var(--spidey-red)',
}

export function MissionsPanel({ open, profile, onClose, onOpenQuiz, onOpenDiscoveries }: Props) {
  const adv = useMemo(() => normalizeAdventure(profile.adventure), [profile.adventure])

  return (
    <PixelModal open={open} title="MISSION BOARD" onClose={onClose} wide>
      <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
        <p className="pixel-label" style={{ fontSize: 6, color: 'var(--spidey-text-dim)' }}>
          DAILY / WEEKLY RESET · QUIZ & DISCOVERY FEED THE BOARD
        </p>
        {MISSIONS.map((m) => {
          const progress = adv.missionProgress[m.id] ?? 0
          const done = adv.completedMissions.includes(m.id)
          const ratio = Math.min(1, progress / m.target)
          return (
            <div key={m.id} className="pixel-inset p-2" style={{ borderColor: CAT_COLOR[m.category] }}>
              <div className="flex justify-between gap-2">
                <p className="pixel-label" style={{ fontSize: 7, color: 'var(--spidey-white)' }}>
                  {m.title}
                </p>
                <p className="pixel-label" style={{ fontSize: 6, color: CAT_COLOR[m.category] }}>
                  {m.category.toUpperCase()} · +{m.xp}XP
                </p>
              </div>
              <p
                className="font-[family-name:var(--font-readable)] text-sm mt-1"
                style={{ color: 'var(--spidey-text-dim)' }}
              >
                {m.description}
              </p>
              <div className="xp-bar mt-2">
                <div
                  className="xp-bar__fill"
                  style={{
                    width: `${Math.round(ratio * 100)}%`,
                    background: done ? 'var(--spidey-green)' : 'var(--spidey-cyan)',
                  }}
                />
              </div>
              <p className="pixel-label mt-1" style={{ fontSize: 6, color: done ? 'var(--spidey-green)' : 'var(--spidey-text-dim)' }}>
                {done ? 'COMPLETE' : `${progress}/${m.target}`}
              </p>
            </div>
          )
        })}
        <div className="flex gap-2 mt-1">
          <PixelButton
            className="flex-1 !text-[7px]"
            variant="orange"
            onClick={() => {
              playSound('click')
              onOpenQuiz()
            }}
          >
            START QUIZ
          </PixelButton>
          <PixelButton
            className="flex-1 !text-[7px]"
            variant="cyan"
            onClick={() => {
              playSound('click')
              onOpenDiscoveries()
            }}
          >
            DISCOVERIES
          </PixelButton>
        </div>
      </div>
    </PixelModal>
  )
}

import { useMemo, useState } from 'react'
import { PixelModal } from '../pixel/PixelModal'
import { PixelButton } from '../pixel/PixelButton'
import { PixelSpideySprite } from '../../assets/ui/PixelSpideySprite'
import { SpiderAvatar } from '../../assets/spiders/SpiderAvatar'
import type { SuitId, UserProfile } from '../../types'
import { SUITS, getSuit, RARITY_COLORS } from '../../data/suits'
import { ACHIEVEMENTS } from '../../data/adventure'
import { levelProgress, isSuitUnlocked } from '../../utils/progression'
import { equipSuit } from '../../services/firebase/adventure'
import { playSound } from '../../services/sound/audio'
import { normalizeAdventure } from '../../services/firebase/adventure'

type Props = {
  open: boolean
  profile: UserProfile
  onClose: () => void
  onEditCharacter: () => void
  onOpenMissions: () => void
  onOpenQuiz: () => void
  onOpenFriends: () => void
  onChanged: () => void
}

export function CharacterSheet({
  open,
  profile,
  onClose,
  onEditCharacter,
  onOpenMissions,
  onOpenQuiz,
  onOpenFriends,
  onChanged,
}: Props) {
  const adv = useMemo(() => normalizeAdventure(profile.adventure), [profile.adventure])
  const prog = levelProgress(adv.xp)
  const suit = getSuit(profile.suitId)
  const [busySuit, setBusySuit] = useState<string | null>(null)
  const [tab, setTab] = useState<'stats' | 'suits' | 'achievements'>('stats')
  const [error, setError] = useState<string | null>(null)

  const earned = ACHIEVEMENTS.filter((a) => adv.achievements.includes(a.id))
  const onlineLabel = `${profile.friendIds.length} FRIENDS`

  const onEquip = async (id: SuitId) => {
    setError(null)
    setBusySuit(id)
    try {
      await equipSuit(profile.uid, id)
      playSound('click')
      onChanged()
    } catch (e) {
      playSound('error')
      setError(e instanceof Error ? e.message : 'EQUIP FAILED')
    } finally {
      setBusySuit(null)
    }
  }

  return (
    <PixelModal open={open} title="SPIDER DOSSIER" onClose={onClose} wide>
      <div className="flex flex-col gap-3">
        <div className="flex gap-3 items-end">
          <PixelSpideySprite suitId={profile.suitId} size={96} />
          <div className="flex-1 min-w-0">
            <p className="pixel-label" style={{ color: 'var(--spidey-yellow)', fontSize: 10 }}>
              {profile.displayName}
            </p>
            <p className="pixel-label mt-1" style={{ color: 'var(--spidey-cyan)', fontSize: 7 }}>
              LVL {prog.level} · {suit.name} SUIT
            </p>
            <div className="mt-2">
              <div className="flex justify-between pixel-label mb-1" style={{ fontSize: 6, color: 'var(--spidey-text-dim)' }}>
                <span>XP {prog.into}/{prog.need}</span>
                <span>{adv.xp} TOTAL</span>
              </div>
              <div className="xp-bar">
                <div className="xp-bar__fill" style={{ width: `${Math.round(prog.ratio * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {(
            [
              ['stats', 'STATS'],
              ['suits', 'SUITS'],
              ['achievements', 'BADGES'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="pixel-btn !text-[7px] !py-2"
              style={{
                background: tab === id ? 'var(--spidey-orange)' : 'var(--spidey-panel)',
                color: tab === id ? '#111' : 'var(--spidey-text)',
              }}
              onClick={() => {
                setTab(id)
                playSound('click')
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'stats' && (
          <div className="pixel-inset p-3 flex flex-col gap-2">
            <StatRow label="MISSIONS CLEARED" value={String(adv.completedMissions.length)} />
            <StatRow label="DISCOVERIES" value={String(adv.discoveries.length)} />
            <StatRow label="ACHIEVEMENTS" value={String(adv.achievements.length)} />
            <StatRow label="QUIZ STREAK" value={`${adv.quizStreak} DAY`} />
            <StatRow label="FRIENDS" value={onlineLabel} />
            <StatRow label="SUITS UNLOCKED" value={String(adv.unlockedSuits.length)} />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <PixelButton className="!text-[7px]" onClick={onEditCharacter}>
                EDIT CHARACTER
              </PixelButton>
              <PixelButton className="!text-[7px]" variant="cyan" onClick={onOpenFriends}>
                FRIEND WEB
              </PixelButton>
              <PixelButton className="!text-[7px]" variant="orange" onClick={onOpenMissions}>
                MISSIONS
              </PixelButton>
              <PixelButton className="!text-[7px]" variant="cyan" onClick={onOpenQuiz}>
                QUIZ
              </PixelButton>
            </div>
          </div>
        )}

        {tab === 'suits' && (
          <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto">
            {SUITS.map((s) => {
              const unlocked = isSuitUnlocked(s.id, adv.level, adv.unlockedSuits)
              const equipped = profile.suitId === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={!unlocked || busySuit === s.id}
                  onClick={() => void onEquip(s.id)}
                  className="pixel-inset p-2 flex flex-col items-center gap-1 text-left"
                  style={{
                    outline: equipped ? '2px solid var(--spidey-orange)' : undefined,
                    opacity: unlocked ? 1 : 0.45,
                  }}
                >
                  <SpiderAvatar suitId={s.id} size={36} />
                  <span className="pixel-label" style={{ fontSize: 6, color: 'var(--spidey-white)' }}>
                    {s.name}
                  </span>
                  <span className="pixel-label" style={{ fontSize: 5, color: RARITY_COLORS[s.rarity] }}>
                    {unlocked ? (equipped ? 'EQUIPPED' : 'EQUIP') : 'LOCKED'}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {tab === 'achievements' && (
          <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto">
            {ACHIEVEMENTS.map((a) => {
              const got = adv.achievements.includes(a.id)
              return (
                <div
                  key={a.id}
                  className="pixel-inset p-2 flex justify-between gap-2"
                  style={{ opacity: got ? 1 : 0.4 }}
                >
                  <div>
                    <p className="pixel-label" style={{ fontSize: 7, color: got ? 'var(--spidey-yellow)' : 'var(--spidey-text-dim)' }}>
                      {a.name}
                    </p>
                    <p className="font-[family-name:var(--font-readable)] text-sm" style={{ color: 'var(--spidey-text-dim)' }}>
                      {a.description}
                    </p>
                  </div>
                  <span className="pixel-label" style={{ fontSize: 6, color: 'var(--spidey-cyan)' }}>
                    {got ? '✓' : `+${a.xp}`}
                  </span>
                </div>
              )
            })}
            {earned.length === 0 && (
              <p className="pixel-label text-center" style={{ fontSize: 7, color: 'var(--spidey-text-dim)' }}>
                NO BADGES YET — GO ADVENTURE
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="pixel-label" style={{ color: 'var(--spidey-red)', fontSize: 7 }}>
            {error}
          </p>
        )}
      </div>
    </PixelModal>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="pixel-label" style={{ fontSize: 7, color: 'var(--spidey-text-dim)' }}>
        {label}
      </span>
      <span className="pixel-label" style={{ fontSize: 7, color: 'var(--spidey-white)' }}>
        {value}
      </span>
    </div>
  )
}

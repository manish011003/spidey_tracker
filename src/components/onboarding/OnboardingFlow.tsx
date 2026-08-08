import { useState } from 'react'
import type { SpiderId, SuitId, UserRole } from '../../types'
import { SPIDERS } from '../../data/spiders'
import { SUITS, RARITY_COLORS } from '../../data/suits'
import { SpiderAvatar } from '../../assets/spiders/SpiderAvatar'
import { PixelSpideySprite } from '../../assets/ui/PixelSpideySprite'
import { PixelButton } from '../pixel/PixelButton'
import { PixelLoader } from '../pixel/PixelLoader'
import { completeOnboarding } from '../../services/firebase/users'
import { linkPartner } from '../../services/firebase/relationships'
import { normalizePartnerCode } from '../../utils/partnerCode'
import { defaultIdentityForRole } from '../../utils/identityDefaults'
import { playSound, unlockAudio } from '../../services/sound/audio'
import type { UserProfile } from '../../types'

type Props = {
  profile: UserProfile
  onComplete: () => void
}

type Step = 1 | 2 | 3 | 4 | 5 | 'linking' | 'linked'

export function OnboardingFlow({ profile, onComplete }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [role, setRole] = useState<UserRole | null>(null)
  const [spiderId, setSpiderId] = useState<SpiderId>('classic')
  const [suitId, setSuitId] = useState<SuitId>('classic')
  const [displayName, setDisplayName] = useState(profile.displayName || '')
  const [nickname, setNickname] = useState('')
  const [partnerCode, setPartnerCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [linkPhase, setLinkPhase] = useState(0)

  const finishProfile = async () => {
    if (!role || !displayName.trim()) {
      setError('COMPLETE ALL FIELDS')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await completeOnboarding(profile.uid, {
        role,
        spiderId,
        suitId,
        displayName: displayName.trim(),
        nickname: nickname.trim() || undefined,
      })
      setStep(5)
      playSound('signal')
    } catch {
      setError('FAILED TO SAVE SPIDER PROFILE')
    } finally {
      setBusy(false)
    }
  }

  const doLink = async () => {
    setBusy(true)
    setError(null)
    try {
      const updated: UserProfile = {
        ...profile,
        role: role!,
        spiderId,
        suitId,
        displayName: displayName.trim(),
        nickname: nickname.trim() || undefined,
        onboardingComplete: true,
        friendIds: profile.friendIds ?? [],
        incomingFriendRequests: profile.incomingFriendRequests ?? [],
        outgoingFriendRequests: profile.outgoingFriendRequests ?? [],
        adventure: profile.adventure,
      }
      setStep('linking')
      setLinkPhase(0)
      await new Promise((r) => setTimeout(r, 600))
      setLinkPhase(1)
      await linkPartner(updated, normalizePartnerCode(partnerCode))
      setLinkPhase(2)
      await unlockAudio()
      playSound('pair')
      await new Promise((r) => setTimeout(r, 900))
      setStep('linked')
      await new Promise((r) => setTimeout(r, 800))
      onComplete()
    } catch (e) {
      setStep(5)
      setError(e instanceof Error ? e.message : 'LINK FAILED')
    } finally {
      setBusy(false)
    }
  }

  const copyCode = async () => {
    await navigator.clipboard.writeText(profile.partnerCode)
    playSound('click')
  }

  return (
    <div
      className="min-h-dvh w-full flex items-center justify-center p-4 relative"
      style={{ background: 'var(--spidey-bg)' }}
    >
      <div className="scanlines" />
      <div className="pixel-panel w-full max-w-lg relative z-10 crt-flicker">
        <div
          className="px-4 py-3 border-b-[3px] border-black"
          style={{ background: 'var(--spidey-blue)' }}
        >
          <p className="pixel-label" style={{ color: 'var(--spidey-yellow)' }}>
            SPIDER SETUP — STEP {typeof step === 'number' ? step : '★'}/5
          </p>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {error && (
            <p
              className="font-[family-name:var(--font-readable)] text-xl"
              style={{ color: 'var(--spidey-red)' }}
              role="alert"
            >
              {error}
            </p>
          )}

          {step === 1 && (
            <>
              <h2 className="pixel-label" style={{ color: 'var(--spidey-white)', fontSize: 11 }}>
                IDENTIFY YOUR SPIDER
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['boyfriend', 'girlfriend', 'friend'] as UserRole[]).map((r) => {
                  const defaults = defaultIdentityForRole(r)
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setRole(r)
                        setSpiderId(defaults.spiderId)
                        setSuitId(defaults.suitId)
                        playSound('click')
                      }}
                      className="pixel-inset p-3 flex flex-col items-center gap-2 border-[3px]"
                      style={{
                        borderColor: role === r ? 'var(--spidey-orange)' : 'var(--spidey-black)',
                        background: role === r ? 'var(--spidey-panel-2)' : 'var(--spidey-bg-deep)',
                      }}
                      aria-pressed={role === r}
                    >
                      <PixelSpideySprite size={56} suitId={defaults.suitId} />
                      <span className="pixel-label" style={{ color: 'var(--spidey-cyan)', fontSize: 7 }}>
                        {r.toUpperCase()}
                      </span>
                      <span className="pixel-label" style={{ fontSize: 5, color: 'var(--spidey-text-dim)' }}>
                        {r === 'girlfriend' ? 'GHOST' : r === 'friend' ? 'CREW' : 'CLASSIC'}
                      </span>
                    </button>
                  )
                })}
              </div>
              <PixelButton disabled={!role} onClick={() => setStep(2)}>
                CONTINUE
              </PixelButton>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="pixel-label" style={{ color: 'var(--spidey-white)', fontSize: 11 }}>
                CHOOSE YOUR SPIDER
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[280px] overflow-y-auto">
                {SPIDERS.map((s) => {
                  const locked = s.locked && !profile.partnerId
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        setSpiderId(s.id)
                        playSound('click')
                      }}
                      className="pixel-inset p-2 flex flex-col items-center gap-1"
                      style={{
                        outline: spiderId === s.id ? '3px solid var(--spidey-orange)' : undefined,
                        opacity: locked ? 0.4 : 1,
                      }}
                      aria-pressed={spiderId === s.id}
                    >
                      <SpiderAvatar spiderId={s.id} size={40} />
                      <span className="pixel-label text-center" style={{ fontSize: 6, color: 'var(--spidey-text)' }}>
                        {locked ? 'LOCKED' : s.name.replace(' SPIDER', '')}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="font-[family-name:var(--font-readable)] text-lg" style={{ color: 'var(--spidey-text-dim)' }}>
                {SPIDERS.find((s) => s.id === spiderId)?.description}
              </p>
              <div className="flex gap-2">
                <PixelButton variant="ghost" onClick={() => setStep(1)}>
                  BACK
                </PixelButton>
                <PixelButton className="flex-1" onClick={() => setStep(3)}>
                  CONTINUE
                </PixelButton>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="pixel-label" style={{ color: 'var(--spidey-white)', fontSize: 11 }}>
                CHOOSE YOUR SUIT
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {SUITS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSuitId(s.id)
                      playSound('click')
                    }}
                    className="pixel-inset p-3 min-w-[110px] flex flex-col items-center gap-2"
                    style={{
                      outline: suitId === s.id ? '3px solid var(--spidey-orange)' : undefined,
                      transform: suitId === s.id ? 'translateY(-2px)' : undefined,
                    }}
                    aria-pressed={suitId === s.id}
                  >
                    <PixelSpideySprite suitId={s.id} size={56} />
                    <span className="pixel-label" style={{ fontSize: 7, color: 'var(--spidey-text)' }}>
                      {s.name}
                    </span>
                    <span className="pixel-label" style={{ fontSize: 6, color: RARITY_COLORS[s.rarity] }}>
                      {s.rarity.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
              <p className="font-[family-name:var(--font-readable)] text-lg" style={{ color: 'var(--spidey-text-dim)' }}>
                {SUITS.find((s) => s.id === suitId)?.description}
              </p>
              <div className="flex gap-2">
                <PixelButton variant="ghost" onClick={() => setStep(2)}>
                  BACK
                </PixelButton>
                <PixelButton className="flex-1" onClick={() => setStep(4)}>
                  CONTINUE
                </PixelButton>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="pixel-label" style={{ color: 'var(--spidey-white)', fontSize: 11 }}>
                NAME YOUR SPIDER
              </h2>
              <label className="flex flex-col gap-1">
                <span className="pixel-label">DISPLAY NAME</span>
                <input
                  className="pixel-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={24}
                  aria-label="Display name"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="pixel-label">NICKNAME (OPTIONAL)</span>
                <input
                  className="pixel-input"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={20}
                  aria-label="Nickname"
                />
              </label>
              <div className="flex justify-center">
                <SpiderAvatar spiderId={spiderId} suitId={suitId} size={72} pulse />
              </div>
              <div className="flex gap-2">
                <PixelButton variant="ghost" onClick={() => setStep(3)}>
                  BACK
                </PixelButton>
                <PixelButton className="flex-1" disabled={busy || !displayName.trim()} onClick={() => void finishProfile()}>
                  {busy ? 'SAVING...' : 'SAVE & CONTINUE'}
                </PixelButton>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h2 className="pixel-label" style={{ color: 'var(--spidey-white)', fontSize: 11 }}>
                LINK YOUR PARTNER
              </h2>
              <div className="pixel-inset p-3 text-center">
                <p className="pixel-label mb-2" style={{ color: 'var(--spidey-cyan)' }}>
                  YOUR SPIDER CODE
                </p>
                <p
                  className="font-[family-name:var(--font-pixel)] text-lg tracking-widest"
                  style={{ color: 'var(--spidey-yellow)' }}
                >
                  {profile.partnerCode}
                </p>
                <PixelButton className="mt-3" variant="cyan" onClick={() => void copyCode()}>
                  COPY CODE
                </PixelButton>
              </div>
              <label className="flex flex-col gap-1">
                <span className="pixel-label">ENTER PARTNER CODE</span>
                <input
                  className="pixel-input text-center tracking-widest uppercase"
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(normalizePartnerCode(e.target.value))}
                  placeholder="XXXX-XXXX"
                  aria-label="Partner code"
                />
              </label>
              <div className="flex flex-col gap-2">
                <PixelButton disabled={busy || partnerCode.length < 9} onClick={() => void doLink()}>
                  LINK SPIDERS
                </PixelButton>
                <PixelButton variant="ghost" onClick={onComplete}>
                  SKIP FOR NOW — OPEN TRACKER
                </PixelButton>
              </div>
            </>
          )}

          {(step === 'linking' || step === 'linked') && (
            <div className="py-8 flex flex-col items-center gap-4">
              <PixelLoader
                label={
                  linkPhase === 0
                    ? 'SCANNING FOR SPIDER SIGNAL...'
                    : linkPhase === 1
                      ? 'PARTNER DETECTED...'
                      : 'LINK ESTABLISHED'
                }
                progress={(linkPhase + 1) * 33}
              />
              <SpiderAvatar spiderId={spiderId} suitId={suitId} size={64} pulse />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

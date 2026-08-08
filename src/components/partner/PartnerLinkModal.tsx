import { useEffect, useState } from 'react'
import { PixelModal } from '../pixel/PixelModal'
import { PixelButton } from '../pixel/PixelButton'
import type { UserProfile } from '../../types'
import { linkPartner, unlinkPartner } from '../../services/firebase/relationships'
import { addFriend } from '../../services/firebase/friends'
import { normalizePartnerCode } from '../../utils/partnerCode'
import { playSound, unlockAudio } from '../../services/sound/audio'
import { ShareCodeButtons } from '../share/ShareCodeButtons'

type Mode = 'partner' | 'friend'

type Props = {
  open: boolean
  profile: UserProfile
  partner: UserProfile | null
  onClose: () => void
  onChanged: () => void
  /** Open already set to friend or partner mode */
  initialMode?: Mode
}

export function PartnerLinkModal({
  open,
  profile,
  partner,
  onClose,
  onChanged,
  initialMode = 'partner',
}: Props) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmUnlink, setConfirmUnlink] = useState(false)
  const [friendNotice, setFriendNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMode(initialMode)
    setCode('')
    setError(null)
    setFriendNotice(null)
    setConfirmUnlink(false)
  }, [open, initialMode])

  const link = async () => {
    setBusy(true)
    setError(null)
    setFriendNotice(null)
    try {
      if (mode === 'friend') {
        const friend = await addFriend(profile, code)
        playSound('signal')
        setFriendNotice(`REQUEST SENT → ${friend.displayName.toUpperCase()}`)
        setCode('')
        onChanged()
      } else {
        await linkPartner(profile, code)
        await unlockAudio()
        playSound('pair')
        onChanged()
        onClose()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'LINK FAILED')
      playSound('error')
    } finally {
      setBusy(false)
    }
  }

  const unlink = async () => {
    setBusy(true)
    setError(null)
    try {
      await unlinkPartner(profile)
      playSound('signal')
      setConfirmUnlink(false)
      onChanged()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'UNLINK FAILED')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PixelModal open={open} title="SPIDER NETWORK" onClose={onClose}>
      <div className="flex flex-col gap-3">
        {error && (
          <p className="font-[family-name:var(--font-readable)] text-xl" style={{ color: 'var(--spidey-red)' }}>
            {error}
          </p>
        )}
        {friendNotice && (
          <p className="font-[family-name:var(--font-readable)] text-xl" style={{ color: 'var(--spidey-green)' }}>
            {friendNotice}
          </p>
        )}

        <div className="pixel-inset p-3 text-center">
          <p className="pixel-label" style={{ color: 'var(--spidey-cyan)', fontSize: 7 }}>
            YOUR SPIDER CODE
          </p>
          <p
            className="font-[family-name:var(--font-pixel)] text-base tracking-widest mt-2"
            style={{ color: 'var(--spidey-yellow)' }}
          >
            {profile.partnerCode}
          </p>
          <ShareCodeButtons
            code={profile.partnerCode}
            displayName={profile.displayName}
            compact
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <PixelButton
            variant={mode === 'partner' ? 'orange' : 'ghost'}
            className="!text-[7px]"
            onClick={() => {
              setMode('partner')
              setError(null)
            }}
          >
            PARTNER
          </PixelButton>
          <PixelButton
            variant={mode === 'friend' ? 'orange' : 'ghost'}
            className="!text-[7px]"
            onClick={() => {
              setMode('friend')
              setError(null)
            }}
          >
            ADD FRIEND
          </PixelButton>
        </div>

        {mode === 'partner' && partner ? (
          <>
            <p className="pixel-label" style={{ color: 'var(--spidey-green)' }}>
              PARTNER LINK: ACTIVE
            </p>
            <p
              className="font-[family-name:var(--font-readable)] text-2xl"
              style={{ color: 'var(--spidey-text)' }}
            >
              {partner.displayName}
            </p>
            <p className="pixel-label" style={{ color: 'var(--spidey-text-dim)', fontSize: 7 }}>
              Shared events are kept if you unlink.
            </p>
            {!confirmUnlink ? (
              <PixelButton variant="red" onClick={() => setConfirmUnlink(true)}>
                UNLINK PARTNER
              </PixelButton>
            ) : (
              <div className="flex gap-2">
                <PixelButton variant="ghost" className="flex-1" onClick={() => setConfirmUnlink(false)}>
                  CANCEL
                </PixelButton>
                <PixelButton variant="red" className="flex-1" disabled={busy} onClick={() => void unlink()}>
                  CONFIRM UNLINK
                </PixelButton>
              </div>
            )}
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1">
              <span className="pixel-label">
                {mode === 'friend' ? 'ENTER FRIEND CODE' : 'ENTER PARTNER CODE'}
              </span>
              <input
                className="pixel-input text-center tracking-widest uppercase"
                value={code}
                onChange={(e) => setCode(normalizePartnerCode(e.target.value))}
                placeholder="XXXX-XXXX"
              />
            </label>
            <p
              className="font-[family-name:var(--font-readable)] text-lg"
              style={{ color: 'var(--spidey-text-dim)' }}
            >
              {mode === 'friend'
                ? `Friends on your web: ${profile.friendIds.length}`
                : 'Partner is your exclusive BF/GF link.'}
            </p>
            <PixelButton disabled={busy || code.length < 9} onClick={() => void link()}>
              {mode === 'friend' ? 'ADD FRIEND' : 'LINK SPIDERS'}
            </PixelButton>
          </>
        )}
      </div>
    </PixelModal>
  )
}

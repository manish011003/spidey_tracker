import { useState } from 'react'
import { PixelModal } from '../pixel/PixelModal'
import { PixelButton } from '../pixel/PixelButton'
import { SpiderAvatar } from '../../assets/spiders/SpiderAvatar'
import { PixelSpideySprite } from '../../assets/ui/PixelSpideySprite'
import type { SpiderId, SuitId, UserProfile } from '../../types'
import { SUITS } from '../../data/suits'
import { SPIDERS } from '../../data/spiders'
import { getSuit } from '../../data/suits'
import { getSpider } from '../../data/spiders'
import { playSound, setSoundEnabled } from '../../services/sound/audio'
import { updatePreferences, updateProfileFields } from '../../services/firebase/users'
import { deleteAccount } from '../../services/firebase/account'

type Props = {
  open: boolean
  profile: UserProfile
  onClose: () => void
  onSignOut: () => void
  onOpenPartnerLink: () => void
  onOpenGuide?: () => void
  sharing: boolean
  precise: boolean
  onToggleSharing: (v: boolean) => void
  onTogglePrecise: (v: boolean) => void
  onDeleted?: () => void
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-black/30">
      <span className="pixel-label" style={{ color: 'var(--spidey-text)', fontSize: 8 }}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className="pixel-btn !py-1 !px-2 !text-[8px]"
        style={{ background: value ? 'var(--spidey-green)' : 'var(--spidey-red)', color: '#111' }}
      >
        {value ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}

export function ProfilePanel({
  open,
  profile,
  onClose,
  onSignOut,
  onOpenPartnerLink,
  onOpenGuide,
  sharing,
  precise,
  onToggleSharing,
  onTogglePrecise,
  onDeleted,
}: Props) {
  const [editingCharacter, setEditingCharacter] = useState(false)
  const [spiderId, setSpiderId] = useState<SpiderId>(profile.spiderId)
  const [suitId, setSuitId] = useState<SuitId>(profile.suitId)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const suit = getSuit(profile.suitId)
  const spider = getSpider(profile.spiderId)

  const openCharacterEditor = () => {
    setSpiderId(profile.spiderId)
    setSuitId(profile.suitId === 'mystery' ? 'ghost' : profile.suitId)
    setEditingCharacter(true)
    setError(null)
    playSound('click')
  }

  const saveCharacter = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateProfileFields(profile.uid, { spiderId, suitId })
      playSound('signal')
      setEditingCharacter(false)
    } catch {
      setError('FAILED TO UPDATE SPIDER')
    } finally {
      setSaving(false)
    }
  }

  const updatePref = async (key: keyof UserProfile['preferences'], value: boolean) => {
    await updatePreferences(profile.uid, { [key]: value })
    if (key === 'soundEnabled') {
      setSoundEnabled(value)
      if (value) playSound('click')
    }
    if (key === 'reduceMotion') {
      document.documentElement.classList.toggle('reduce-motion', value)
    }
  }

  const handleDelete = async () => {
    setDeleteBusy(true)
    setError(null)
    try {
      await deleteAccount(profile)
      playSound('click')
      onDeleted?.()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'DELETE FAILED')
      setConfirmDelete(false)
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <PixelModal open={open} title="YOUR SPIDER" onClose={onClose}>
      <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
        {error && (
          <p
            className="font-[family-name:var(--font-readable)] text-xl"
            style={{ color: 'var(--spidey-red)' }}
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <PixelSpideySprite suitId={profile.suitId} size={72} />
          <div>
            <p className="pixel-label" style={{ color: 'var(--spidey-white)', fontSize: 10 }}>
              {profile.displayName}
            </p>
            <p className="pixel-label mt-1" style={{ color: 'var(--spidey-cyan)', fontSize: 7 }}>
              {profile.role.toUpperCase()} · {spider.name}
            </p>
            <p className="pixel-label mt-1" style={{ color: 'var(--spidey-yellow)', fontSize: 7 }}>
              SUIT: {suit.name}
            </p>
          </div>
        </div>

        {!editingCharacter ? (
          <PixelButton variant="cyan" className="w-full" onClick={openCharacterEditor}>
            CHANGE SPIDEY CHARACTER
          </PixelButton>
        ) : (
          <div className="pixel-inset p-3 flex flex-col gap-3">
            <p className="pixel-label" style={{ color: 'var(--spidey-orange)', fontSize: 8 }}>
              CHANGE SPIDEY CHARACTER
            </p>
            <div className="flex justify-center">
              <PixelSpideySprite suitId={suitId} size={96} />
            </div>
            <p className="pixel-label" style={{ color: 'var(--spidey-cyan)', fontSize: 7 }}>
              SUIT
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[160px] overflow-y-auto">
              {SUITS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSuitId(s.id)
                    playSound('click')
                  }}
                  className="pixel-inset p-1 flex flex-col items-center gap-1"
                  style={{
                    outline: suitId === s.id ? '2px solid var(--spidey-orange)' : undefined,
                  }}
                  aria-pressed={suitId === s.id}
                >
                  <PixelSpideySprite suitId={s.id} size={40} />
                  <span className="pixel-label" style={{ fontSize: 5, color: 'var(--spidey-text)' }}>
                    {s.name}
                  </span>
                </button>
              ))}
            </div>
            <p className="pixel-label" style={{ color: 'var(--spidey-cyan)', fontSize: 7 }}>
              AVATAR ICON
            </p>
            <div className="grid grid-cols-4 gap-1 max-h-[100px] overflow-y-auto">
              {SPIDERS.filter((s) => !s.locked || profile.partnerId).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSpiderId(s.id)
                    playSound('click')
                  }}
                  className="pixel-inset p-1 flex items-center justify-center"
                  style={{
                    outline: spiderId === s.id ? '2px solid var(--spidey-orange)' : undefined,
                  }}
                  aria-label={s.name}
                  aria-pressed={spiderId === s.id}
                >
                  <SpiderAvatar spiderId={s.id} size={28} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <PixelButton
                variant="ghost"
                className="flex-1"
                onClick={() => setEditingCharacter(false)}
                disabled={saving}
              >
                CANCEL
              </PixelButton>
              <PixelButton className="flex-1" onClick={() => void saveCharacter()} disabled={saving}>
                {saving ? 'SAVING...' : 'SAVE'}
              </PixelButton>
            </div>
          </div>
        )}

        <div className="pixel-inset p-2 text-center">
          <p className="pixel-label" style={{ color: 'var(--spidey-text-dim)', fontSize: 7 }}>
            SPIDER CODE
          </p>
          <p
            className="font-[family-name:var(--font-pixel)] text-sm tracking-widest mt-1"
            style={{ color: 'var(--spidey-yellow)' }}
          >
            {profile.partnerCode}
          </p>
        </div>

        {onOpenGuide && (
          <PixelButton
            variant="cyan"
            className="w-full"
            onClick={() => {
              playSound('click')
              onOpenGuide()
            }}
          >
            WEB GUIDE / CHART
          </PixelButton>
        )}

        <div>
          <p className="pixel-label mb-1" style={{ color: 'var(--spidey-cyan)' }}>
            PARTNER LINK
          </p>
          <p
            className="font-[family-name:var(--font-readable)] text-xl"
            style={{ color: 'var(--spidey-text)' }}
          >
            {profile.partnerId ? 'LINKED' : 'NOT LINKED'}
          </p>
          <PixelButton className="mt-2 w-full" variant="cyan" onClick={onOpenPartnerLink}>
            {profile.partnerId ? 'MANAGE LINK' : 'LINK PARTNER'}
          </PixelButton>
        </div>

        <div>
          <p className="pixel-label mb-1" style={{ color: 'var(--spidey-cyan)' }}>
            LOCATION SHARING
          </p>
          <p
            className="font-[family-name:var(--font-readable)] text-lg mb-2"
            style={{ color: 'var(--spidey-text-dim)' }}
          >
            Opt-in only — friends & partner never see you unless you share.
          </p>
          <Toggle label="SHARE MY LOCATION" value={sharing} onChange={onToggleSharing} />
          <Toggle label="PRECISE LOCATION" value={precise} onChange={onTogglePrecise} />
        </div>

        <div>
          <Toggle
            label="SOUND"
            value={profile.preferences.soundEnabled}
            onChange={(v) => void updatePref('soundEnabled', v)}
          />
          <Toggle
            label="REDUCE MOTION"
            value={profile.preferences.reduceMotion}
            onChange={(v) => void updatePref('reduceMotion', v)}
          />
          <Toggle
            label="SKIP BOOT ANIMATION"
            value={profile.preferences.skipBootAnimation}
            onChange={(v) => void updatePref('skipBootAnimation', v)}
          />
        </div>

        <PixelButton variant="red" onClick={onSignOut}>
          SIGN OUT
        </PixelButton>

        {!confirmDelete ? (
          <button
            type="button"
            className="pixel-label py-2 text-center"
            style={{ color: 'var(--spidey-red)', fontSize: 7, background: 'transparent', border: 'none', cursor: 'pointer' }}
            onClick={() => {
              setConfirmDelete(true)
              playSound('click')
            }}
          >
            DELETE ACCOUNT
          </button>
        ) : (
          <div className="pixel-inset p-3 flex flex-col gap-2" style={{ borderColor: 'var(--spidey-red)' }}>
            <p className="pixel-label" style={{ color: 'var(--spidey-red)', fontSize: 8 }}>
              PERMANENTLY ERASE THIS SPIDER?
            </p>
            <p
              className="font-[family-name:var(--font-readable)] text-lg"
              style={{ color: 'var(--spidey-text-dim)' }}
            >
              Unlinks partner. Shared events stay. Cannot undo.
            </p>
            <div className="flex gap-2">
              <PixelButton
                variant="ghost"
                className="flex-1"
                disabled={deleteBusy}
                onClick={() => setConfirmDelete(false)}
              >
                CANCEL
              </PixelButton>
              <PixelButton
                variant="red"
                className="flex-1"
                disabled={deleteBusy}
                onClick={() => void handleDelete()}
              >
                {deleteBusy ? 'ERASING...' : 'CONFIRM DELETE'}
              </PixelButton>
            </div>
          </div>
        )}
      </div>
    </PixelModal>
  )
}

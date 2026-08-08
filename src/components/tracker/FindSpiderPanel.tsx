import { useEffect, useMemo, useState } from 'react'
import { PixelModal } from '../pixel/PixelModal'
import { PixelButton } from '../pixel/PixelButton'
import { SpiderAvatar } from '../../assets/spiders/SpiderAvatar'
import type { PresenceData, UserProfile } from '../../types'
import { sendFriendRequest } from '../../services/firebase/friends'
import { normalizePartnerCode } from '../../utils/partnerCode'
import { playSound } from '../../services/sound/audio'
import { normalizeAdventure } from '../../services/firebase/adventure'
import { formatSignalLabel, getPresenceStatus } from '../../utils/geo'

export type FindSpiderTarget = {
  uid: string
  kind: 'partner' | 'friend'
  profile: UserProfile
  presence: PresenceData | null | undefined
}

type Props = {
  open: boolean
  profile: UserProfile
  partner: UserProfile | null
  partnerPresence: PresenceData
  friends: UserProfile[]
  friendPresence: Record<string, PresenceData>
  onClose: () => void
  onChanged: () => void
  onSelect: (target: FindSpiderTarget) => void
  onOpenFriendsHub: () => void
  now?: number
}

export function FindSpiderPanel({
  open,
  profile,
  partner,
  partnerPresence,
  friends,
  friendPresence,
  onClose,
  onChanged,
  onSelect,
  onOpenFriendsHub,
  now = Date.now(),
}: Props) {
  const [query, setQuery] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setCode('')
      setError(null)
      setMsg(null)
    }
  }, [open])

  const spiders = useMemo(() => {
    const list: FindSpiderTarget[] = []
    if (partner) {
      list.push({
        uid: partner.uid,
        kind: 'partner',
        profile: partner,
        presence: partnerPresence,
      })
    }
    for (const f of friends) {
      if (partner && f.uid === partner.uid) continue
      list.push({
        uid: f.uid,
        kind: 'friend',
        profile: f,
        presence: friendPresence[f.uid],
      })
    }
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((s) => {
      const name = s.profile.displayName.toLowerCase()
      const spiderId = s.profile.spiderId.toLowerCase()
      const codeMatch = (s.profile.partnerCode ?? '').toLowerCase().includes(q)
      return name.includes(q) || spiderId.includes(q) || codeMatch
    })
  }, [partner, partnerPresence, friends, friendPresence, query])

  const sendRequest = async () => {
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      await sendFriendRequest(profile, normalizePartnerCode(code))
      playSound('connect')
      setMsg('FRIEND REQUEST SENT')
      setCode('')
      onChanged()
    } catch (e) {
      playSound('error')
      setError(e instanceof Error ? e.message : 'REQUEST FAILED')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PixelModal open={open} title="FIND SPIDER" onClose={onClose} wide>
      <div className="flex flex-col gap-3 max-h-[65vh] overflow-y-auto">
        <p className="pixel-label" style={{ fontSize: 6, color: 'var(--spidey-text-dim)' }}>
          SEARCH YOUR WEB · ADD FRIENDS BY CODE · TAP TO FLY
        </p>

        <input
          className="pixel-input w-full"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SEARCH NAME / ID"
          maxLength={40}
        />

        <div className="flex flex-col gap-2">
          {spiders.length === 0 ? (
            <div className="pixel-inset p-3 text-center">
              <p className="pixel-label" style={{ fontSize: 7, color: 'var(--spidey-yellow)' }}>
                {query ? 'NO MATCH' : 'NO SPIDERS LINKED YET'}
              </p>
              <p
                className="font-[family-name:var(--font-readable)] text-sm mt-2"
                style={{ color: 'var(--spidey-text-dim)' }}
              >
                Add a friend with their spider code below.
              </p>
            </div>
          ) : (
            spiders.map((s) => {
              const p = s.presence
              const sharing = Boolean(p?.locationSharingEnabled && p.latitude != null)
              const status = getPresenceStatus(Boolean(p?.online), p?.lastSeen, now)
              const online = status === 'online'
              const signal = sharing
                ? formatSignalLabel(p?.timestamp ?? p?.lastSeen, {
                    weak: status !== 'online',
                    now,
                  })
                : 'LOC PRIVATE'
              return (
                <button
                  key={s.uid}
                  type="button"
                  className="pixel-inset p-2 flex items-center gap-2 w-full text-left"
                  onClick={() => {
                    playSound('signal')
                    onSelect(s)
                  }}
                >
                  <SpiderAvatar suitId={s.profile.suitId} size={36} pulse={online} />
                  <div className="flex-1 min-w-0">
                    <p
                      className="pixel-label truncate"
                      style={{ fontSize: 7, color: 'var(--spidey-white)' }}
                    >
                      {s.profile.displayName}
                    </p>
                    <p className="pixel-label" style={{ fontSize: 6, color: 'var(--spidey-cyan)' }}>
                      {s.kind === 'partner' ? 'PARTNER' : 'FRIEND'} · LVL{' '}
                      {normalizeAdventure(s.profile.adventure).level}
                    </p>
                    <p
                      className="pixel-label"
                      style={{
                        fontSize: 5,
                        color: sharing
                          ? online
                            ? 'var(--spidey-green)'
                            : 'var(--spidey-yellow)'
                          : 'var(--spidey-text-dim)',
                      }}
                    >
                      {signal}
                      {sharing ? '' : ' · CANNOT FLY YET'}
                    </p>
                  </div>
                  <span
                    className="pixel-label shrink-0"
                    style={{ fontSize: 6, color: 'var(--spidey-orange)' }}
                  >
                    {sharing ? 'GO →' : '···'}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div>
          <p className="pixel-label mb-1" style={{ color: 'var(--spidey-cyan)', fontSize: 7 }}>
            ADD FRIEND BY CODE
          </p>
          <input
            className="pixel-input w-full mb-2"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SPIDER CODE"
            maxLength={12}
          />
          <PixelButton
            className="w-full"
            disabled={busy || code.length < 4}
            onClick={() => void sendRequest()}
          >
            {busy ? 'SENDING...' : 'SEND FRIEND REQUEST'}
          </PixelButton>
        </div>

        <PixelButton
          variant="ghost"
          className="w-full !text-[7px]"
          onClick={() => {
            playSound('click')
            onClose()
            onOpenFriendsHub()
          }}
        >
          OPEN FULL FRIEND WEB
        </PixelButton>

        {msg && (
          <p className="pixel-label text-center" style={{ color: 'var(--spidey-green)', fontSize: 7 }}>
            {msg}
          </p>
        )}
        {error && (
          <p className="pixel-label text-center" style={{ color: 'var(--spidey-red)', fontSize: 7 }}>
            {error}
          </p>
        )}
      </div>
    </PixelModal>
  )
}

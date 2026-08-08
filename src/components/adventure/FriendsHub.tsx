import { useEffect, useMemo, useState } from 'react'
import { PixelModal } from '../pixel/PixelModal'
import { PixelButton } from '../pixel/PixelButton'
import { SpiderAvatar } from '../../assets/spiders/SpiderAvatar'
import type { PresenceData, UserProfile } from '../../types'
import { useFriends } from '../../hooks/useFriends'
import {
  acceptFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
} from '../../services/firebase/friends'
import { normalizePartnerCode } from '../../utils/partnerCode'
import { playSound } from '../../services/sound/audio'
import { normalizeAdventure } from '../../services/firebase/adventure'

type Props = {
  open: boolean
  profile: UserProfile
  friendPresence: Record<string, PresenceData>
  onClose: () => void
  onChanged: () => void
  onSelectFriend?: (uid: string) => void
}

export function FriendsHub({
  open,
  profile,
  friendPresence,
  onClose,
  onChanged,
  onSelectFriend,
}: Props) {
  const friends = useFriends(profile.friendIds)
  const requesters = useFriends(profile.incomingFriendRequests)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const onlineCount = useMemo(
    () => friends.filter((f) => friendPresence[f.uid]?.online).length,
    [friends, friendPresence],
  )

  useEffect(() => {
    if (!open) {
      setError(null)
      setMsg(null)
    }
  }, [open])

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
    <PixelModal open={open} title="FRIEND WEB" onClose={onClose} wide>
      <div className="flex flex-col gap-3">
        <div className="pixel-inset p-2 flex justify-around">
          <div className="text-center">
            <p className="pixel-label" style={{ fontSize: 6, color: 'var(--spidey-text-dim)' }}>
              FRIENDS
            </p>
            <p className="pixel-label" style={{ fontSize: 12, color: 'var(--spidey-yellow)' }}>
              {profile.friendIds.length}
            </p>
          </div>
          <div className="text-center">
            <p className="pixel-label" style={{ fontSize: 6, color: 'var(--spidey-text-dim)' }}>
              ONLINE
            </p>
            <p className="pixel-label" style={{ fontSize: 12, color: 'var(--spidey-green)' }}>
              {onlineCount}
            </p>
          </div>
          <div className="text-center">
            <p className="pixel-label" style={{ fontSize: 6, color: 'var(--spidey-text-dim)' }}>
              REQUESTS
            </p>
            <p className="pixel-label" style={{ fontSize: 12, color: 'var(--spidey-cyan)' }}>
              {profile.incomingFriendRequests.length}
            </p>
          </div>
        </div>

        <p className="pixel-label" style={{ fontSize: 6, color: 'var(--spidey-text-dim)' }}>
          LOCATION STAYS PRIVATE — FRIENDS ONLY SEE YOU IF YOU OPT IN TO SHARE.
        </p>

        {requesters.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="pixel-label" style={{ color: 'var(--spidey-orange)', fontSize: 7 }}>
              INCOMING REQUESTS
            </p>
            {requesters.map((r) => (
              <div key={r.uid} className="pixel-inset p-2 flex items-center gap-2">
                <SpiderAvatar suitId={r.suitId} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="pixel-label truncate" style={{ fontSize: 7, color: 'var(--spidey-white)' }}>
                    {r.displayName}
                  </p>
                  <p className="pixel-label" style={{ fontSize: 6, color: 'var(--spidey-cyan)' }}>
                    LVL {normalizeAdventure(r.adventure).level}
                  </p>
                </div>
                <PixelButton
                  className="!text-[6px] !py-1 !px-2"
                  onClick={() =>
                    void acceptFriendRequest(profile, r.uid)
                      .then(() => {
                        playSound('pair')
                        onChanged()
                      })
                      .catch(() => playSound('error'))
                  }
                >
                  ACCEPT
                </PixelButton>
                <PixelButton
                  variant="ghost"
                  className="!text-[6px] !py-1 !px-2"
                  onClick={() =>
                    void declineFriendRequest(profile, r.uid)
                      .then(() => onChanged())
                      .catch(() => playSound('error'))
                  }
                >
                  NO
                </PixelButton>
              </div>
            ))}
          </div>
        )}

        <div>
          <p className="pixel-label mb-1" style={{ color: 'var(--spidey-cyan)', fontSize: 7 }}>
            SEND FRIEND REQUEST
          </p>
          <input
            className="pixel-input w-full mb-2"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SPIDER CODE"
            maxLength={12}
          />
          <PixelButton className="w-full" disabled={busy || code.length < 4} onClick={() => void sendRequest()}>
            {busy ? 'SENDING...' : 'SEND REQUEST'}
          </PixelButton>
        </div>

        <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
          <p className="pixel-label" style={{ color: 'var(--spidey-yellow)', fontSize: 7 }}>
            YOUR WEB
          </p>
          {friends.length === 0 && (
            <p className="pixel-label" style={{ fontSize: 7, color: 'var(--spidey-text-dim)' }}>
              NO FRIENDS YET — SEND A CODE
            </p>
          )}
          {friends.map((f) => {
            const p = friendPresence[f.uid]
            const sharing = Boolean(p?.locationSharingEnabled)
            const online = Boolean(p?.online)
            return (
              <button
                key={f.uid}
                type="button"
                className="pixel-inset p-2 flex items-center gap-2 w-full text-left"
                onClick={() => onSelectFriend?.(f.uid)}
              >
                <SpiderAvatar suitId={f.suitId} size={36} pulse={online} />
                <div className="flex-1 min-w-0">
                  <p className="pixel-label truncate" style={{ fontSize: 7, color: 'var(--spidey-white)' }}>
                    {f.displayName}
                  </p>
                  <p className="pixel-label" style={{ fontSize: 6, color: 'var(--spidey-cyan)' }}>
                    LVL {normalizeAdventure(f.adventure).level} · {getSuitName(f.suitId)}
                  </p>
                  <p className="pixel-label" style={{ fontSize: 5, color: online ? 'var(--spidey-green)' : '#666' }}>
                    {online ? 'ONLINE' : 'OFFLINE'}
                    {sharing ? ' · SHARING LOC' : ' · LOC PRIVATE'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {msg && (
          <p className="pixel-label" style={{ color: 'var(--spidey-green)', fontSize: 7 }}>
            {msg}
          </p>
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

function getSuitName(id: string) {
  return id.toUpperCase()
}

import { useEffect, useId, useRef, useState } from 'react'
import { HoverLogoAvatar } from '../../assets/ui/HoverLogoAvatar'
import { SpiderMaskIcon, SpideyLogo } from '../../assets/spiders/SpiderAvatar'
import type { PresenceData, PresenceStatus, UserProfile } from '../../types'
import { getPresenceStatus, formatRelativeTime } from '../../utils/geo'
import { playSound } from '../../services/sound/audio'

export type NetworkSpider = {
  profile: UserProfile
  kind: 'partner' | 'friend'
  presence?: PresenceData | null
}

type Props = {
  user: UserProfile
  partner: UserProfile | null
  friends?: UserProfile[]
  friendPresence?: Record<string, PresenceData>
  userOnline: boolean
  partnerLastSeen?: number | null
  partnerOnline?: boolean
  partnerPresence?: PresenceData | null
  now?: number
  onUserClick: () => void
  /** Single partner (no friends) — open partner panel / link */
  onPartnerClick: () => void
  /** Pick a spider from the network dropdown */
  onSelectSpider: (spider: NetworkSpider) => void
  onLogoClick: () => void
}

function StatusDot({ status }: { status: PresenceStatus }) {
  const color =
    status === 'online'
      ? 'var(--spidey-green)'
      : status === 'fading'
        ? 'var(--spidey-yellow)'
        : '#555'
  return (
    <span
      className="inline-block w-2 h-2"
      style={{ background: color, boxShadow: '1px 1px 0 #020810' }}
      aria-hidden
    />
  )
}

function statusNote(
  online: boolean | undefined,
  lastSeen: number | null | undefined,
  now: number,
  linked: boolean,
): string {
  if (!linked) return 'NO LINK'
  const status = getPresenceStatus(Boolean(online), lastSeen, now)
  if (status === 'online') return 'SPIDER ONLINE'
  if (status === 'fading') return 'SIGNAL FADING'
  return formatRelativeTime(lastSeen, now)
}

export function TrackerHeader({
  user,
  partner,
  friends = [],
  friendPresence = {},
  userOnline,
  partnerLastSeen,
  partnerOnline,
  partnerPresence,
  now = Date.now(),
  onUserClick,
  onPartnerClick,
  onSelectSpider,
  onLogoClick,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const network: NetworkSpider[] = []
  if (partner) {
    network.push({ profile: partner, kind: 'partner', presence: partnerPresence })
  }
  for (const f of friends) {
    network.push({ profile: f, kind: 'friend', presence: friendPresence[f.uid] })
  }

  const hasExtras = friends.length > 0
  const primary = partner ?? friends[0] ?? null
  const primaryPresence = partner
    ? partnerPresence
    : primary
      ? friendPresence[primary.uid]
      : null
  const partnerStatus = getPresenceStatus(Boolean(partnerOnline), partnerLastSeen, now)
  const userNote = user.statusMessage || (userOnline ? 'SPIDER ONLINE' : 'SIGNAL OFFLINE')
  const primaryNote = primary
    ? statusNote(primaryPresence?.online, primaryPresence?.lastSeen ?? partnerLastSeen, now, true)
    : 'TAP TO LINK'

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const onOtherClick = () => {
    playSound('click')
    if (!partner && friends.length === 0) {
      onPartnerClick()
      return
    }
    if (hasExtras) {
      setMenuOpen((v) => !v)
      return
    }
    // Partner only — open partner panel directly
    onPartnerClick()
  }

  return (
    <header className="tracker-header flex items-center justify-between gap-1 sm:gap-2 w-full px-0.5">
      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
        <HoverLogoAvatar
          suitId={user.suitId}
          size={44}
          label={user.displayName}
          message={userNote}
          notification={user.role.toUpperCase()}
          onClick={onUserClick}
        />
        <div className="hidden sm:flex flex-col min-w-0">
          <span
            className="pixel-label truncate max-w-[100px]"
            style={{ color: 'var(--spidey-white)', fontSize: 7 }}
          >
            {user.displayName}
          </span>
          <span
            className="flex items-center gap-1 pixel-label"
            style={{ color: 'var(--spidey-text-dim)', fontSize: 6 }}
          >
            <StatusDot status={userOnline ? 'online' : 'offline'} />
            {userOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onLogoClick}
        className="pixel-title-plate flex items-center gap-1 sm:gap-2 mx-1 shrink min-w-0"
        aria-label="Spidey Tracker"
      >
        <span
          className="font-[family-name:var(--font-pixel)] text-[clamp(7px,2vw,12px)] truncate"
          style={{ color: 'var(--spidey-white)', textShadow: '2px 2px 0 #020810' }}
        >
          SPIDEY
        </span>
        <SpiderMaskIcon size={20} />
        <span
          className="font-[family-name:var(--font-pixel)] text-[clamp(7px,2vw,12px)] truncate"
          style={{ color: 'var(--spidey-white)', textShadow: '2px 2px 0 #020810' }}
        >
          TRACKER
        </span>
      </button>

      <div className="relative flex items-center gap-1 sm:gap-2 min-w-0 justify-end" ref={menuRef}>
        <div className="hidden sm:flex flex-col items-end min-w-0">
          {primary ? (
            <>
              <span
                className="pixel-label truncate max-w-[100px]"
                style={{ color: 'var(--spidey-white)', fontSize: 7 }}
              >
                {primary.displayName}
                {hasExtras ? ` +${friends.length}` : ''}
              </span>
              <span
                className="flex items-center gap-1 pixel-label"
                style={{ color: 'var(--spidey-text-dim)', fontSize: 6 }}
              >
                <StatusDot
                  status={
                    partner
                      ? partnerStatus
                      : getPresenceStatus(
                          Boolean(primaryPresence?.online),
                          primaryPresence?.lastSeen,
                          now,
                        )
                  }
                />
                {hasExtras ? `${network.length} ON WEB` : primaryNote}
              </span>
            </>
          ) : (
            <span className="pixel-label" style={{ color: 'var(--spidey-text-dim)', fontSize: 6 }}>
              AWAITING LINK
            </span>
          )}
        </div>

        <div className="relative">
          <HoverLogoAvatar
            suitId={primary?.suitId ?? 'noir'}
            size={44}
            label={primary?.displayName ?? 'NO PARTNER'}
            message={
              hasExtras
                ? 'TAP FOR NETWORK'
                : primary
                  ? primaryNote
                  : 'TAP TO LINK'
            }
            notification={
              hasExtras
                ? `${network.length} SPIDERS`
                : primary
                  ? primary.role.toUpperCase()
                  : 'ADD LINK'
            }
            onClick={onOtherClick}
            floating={Boolean(primary)}
          />
          {hasExtras && (
            <span className="network-badge" aria-hidden>
              {network.length}
            </span>
          )}

          {menuOpen && hasExtras && (
            <div
              id={menuId}
              className="spider-network-menu"
              role="menu"
              aria-label="Spider network"
            >
              <p className="pixel-label spider-network-menu__title">SPIDER NETWORK</p>
              {network.map((item) => {
                const p = item.presence
                const st = getPresenceStatus(Boolean(p?.online), p?.lastSeen, now)
                return (
                  <button
                    key={item.profile.uid}
                    type="button"
                    role="menuitem"
                    className="spider-network-menu__item"
                    onClick={() => {
                      setMenuOpen(false)
                      playSound('click')
                      onSelectSpider(item)
                    }}
                  >
                    <SpideyLogo suitId={item.profile.suitId} size={28} shadow={false} />
                    <span className="spider-network-menu__meta">
                      <span className="pixel-label" style={{ color: 'var(--spidey-white)', fontSize: 7 }}>
                        {item.profile.displayName}
                      </span>
                      <span
                        className="pixel-label"
                        style={{
                          color:
                            item.kind === 'partner' ? 'var(--spidey-orange)' : 'var(--spidey-cyan)',
                          fontSize: 6,
                        }}
                      >
                        {item.kind === 'partner' ? 'PARTNER' : 'FRIEND'} ·{' '}
                        {st === 'online' ? 'ONLINE' : st === 'fading' ? 'FADING' : 'OFFLINE'}
                      </span>
                    </span>
                    <StatusDot status={st} />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

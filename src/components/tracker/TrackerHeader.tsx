import { HoverLogoAvatar } from '../../assets/ui/HoverLogoAvatar'
import { SpiderMaskIcon } from '../../assets/spiders/SpiderAvatar'
import type { PresenceStatus, UserProfile } from '../../types'
import { getPresenceStatus, formatRelativeTime } from '../../utils/geo'

type Props = {
  user: UserProfile
  partner: UserProfile | null
  userOnline: boolean
  partnerLastSeen?: number | null
  partnerOnline?: boolean
  now?: number
  onUserClick: () => void
  onPartnerClick: () => void
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

export function TrackerHeader({
  user,
  partner,
  userOnline,
  partnerLastSeen,
  partnerOnline,
  now = Date.now(),
  onUserClick,
  onPartnerClick,
  onLogoClick,
}: Props) {
  const partnerStatus = getPresenceStatus(Boolean(partnerOnline), partnerLastSeen, now)
  const userNote =
    user.statusMessage ||
    (userOnline ? 'SPIDER ONLINE' : 'SIGNAL OFFLINE')
  const partnerNote =
    partnerStatus === 'online'
      ? 'SPIDER ONLINE'
      : partnerStatus === 'fading'
        ? 'SIGNAL FADING'
        : partner
          ? formatRelativeTime(partnerLastSeen, now)
          : 'NO LINK'

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

      <div className="flex items-center gap-1 sm:gap-2 min-w-0 justify-end">
        <div className="hidden sm:flex flex-col items-end min-w-0">
          {partner ? (
            <>
              <span
                className="pixel-label truncate max-w-[100px]"
                style={{ color: 'var(--spidey-white)', fontSize: 7 }}
              >
                {partner.displayName}
              </span>
              <span
                className="flex items-center gap-1 pixel-label"
                style={{ color: 'var(--spidey-text-dim)', fontSize: 6 }}
              >
                <StatusDot status={partnerStatus} />
                {partnerNote}
              </span>
            </>
          ) : (
            <span className="pixel-label" style={{ color: 'var(--spidey-text-dim)', fontSize: 6 }}>
              AWAITING LINK
            </span>
          )}
        </div>
        <HoverLogoAvatar
          suitId={partner?.suitId ?? 'noir'}
          size={44}
          label={partner?.displayName ?? 'NO PARTNER'}
          message={partner ? partnerNote : 'TAP TO LINK'}
          notification={partner ? partner.role.toUpperCase() : 'ADD LINK'}
          onClick={onPartnerClick}
          floating={Boolean(partner)}
        />
      </div>
    </header>
  )
}

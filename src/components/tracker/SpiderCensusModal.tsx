import { PixelModal } from '../pixel/PixelModal'
import { PixelButton } from '../pixel/PixelButton'
import { ShareCodeButtons } from '../share/ShareCodeButtons'
import type { UserProfile } from '../../types'
import { playSound } from '../../services/sound/audio'

type Props = {
  open: boolean
  count: number | null
  profile: UserProfile
  onClose: () => void
  onEnterCode: () => void
}

export function SpiderCensusModal({ open, count, profile, onClose, onEnterCode }: Props) {
  const label =
    count == null ? '…' : count === 1 ? '1 SPIDER' : `${count} SPIDERS`

  return (
    <PixelModal open={open} title="PLATFORM CENSUS" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <p
          className="font-[family-name:var(--font-pixel)] text-center text-[clamp(10px,3vw,14px)]"
          style={{ color: 'var(--spidey-cyan)', textShadow: '2px 2px 0 #020810' }}
        >
          {label}
        </p>
        <p
          className="font-[family-name:var(--font-readable)] text-xl text-center"
          style={{ color: 'var(--spidey-text)' }}
        >
          Spidermen & spider-women registered on the web.
        </p>
        <p className="pixel-label text-center" style={{ color: 'var(--spidey-yellow)', fontSize: 7 }}>
          MAKE FRIENDS WITH A SPIDER CODE
        </p>
        <div className="pixel-inset p-3 flex flex-col gap-2">
          <p className="pixel-label" style={{ color: 'var(--spidey-text-dim)', fontSize: 6 }}>
            YOUR CODE
          </p>
          <p
            className="font-[family-name:var(--font-pixel)] text-center text-[clamp(12px,3.5vw,16px)] tracking-wider"
            style={{ color: 'var(--spidey-white)' }}
          >
            {profile.partnerCode}
          </p>
          <ShareCodeButtons code={profile.partnerCode} displayName={profile.displayName} />
        </div>
        <PixelButton
          className="w-full"
          onClick={() => {
            playSound('click')
            onClose()
            onEnterCode()
          }}
        >
          ENTER A FRIEND&apos;S CODE
        </PixelButton>
      </div>
    </PixelModal>
  )
}

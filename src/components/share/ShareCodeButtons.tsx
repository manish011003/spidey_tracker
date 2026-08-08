import { useState } from 'react'
import { PixelButton } from '../pixel/PixelButton'
import { playSound } from '../../services/sound/audio'
import {
  canNativeShare,
  copyCodeOnly,
  copyInvite,
  nativeShareInvite,
  shareOnWhatsApp,
  shareToInstagram,
} from '../../utils/shareInvite'

type Props = {
  code: string
  displayName?: string
  /** Compact layout for tight panels */
  compact?: boolean
}

export function ShareCodeButtons({ code, displayName, compact }: Props) {
  const [status, setStatus] = useState<string | null>(null)
  const flash = (msg: string) => {
    setStatus(msg)
    window.setTimeout(() => setStatus(null), 2800)
  }

  const btn = compact ? '!text-[6px] !py-2 !px-1' : '!text-[7px] !py-2 !px-2'

  return (
    <div className="flex flex-col gap-2 mt-3">
      <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
        <PixelButton
          variant="cyan"
          className={btn}
          onClick={() => {
            void copyCodeOnly(code)
              .then(() => {
                playSound('click')
                flash('CODE COPIED')
              })
              .catch(() => {
                playSound('error')
                flash('COPY FAILED')
              })
          }}
        >
          COPY CODE
        </PixelButton>
        <PixelButton
          variant="orange"
          className={btn}
          onClick={() => {
            playSound('click')
            shareOnWhatsApp(code, displayName)
            flash('OPENING WHATSAPP')
          }}
        >
          WHATSAPP
        </PixelButton>
        <PixelButton
          variant="ghost"
          className={btn}
          onClick={() => {
            void shareToInstagram(code, displayName)
              .then(() => {
                playSound('signal')
                flash('INVITE COPIED — PASTE IN IG')
              })
              .catch(() => {
                playSound('error')
                flash('COPY FAILED')
              })
          }}
        >
          INSTAGRAM
        </PixelButton>
        <PixelButton
          variant="ghost"
          className={btn}
          onClick={() => {
            void (async () => {
              try {
                if (canNativeShare()) {
                  const result = await nativeShareInvite(code, displayName)
                  if (result === 'shared') {
                    playSound('signal')
                    flash('SHARED')
                  } else if (result === 'cancelled') {
                    playSound('click')
                  } else {
                    await copyInvite(code, displayName)
                    playSound('click')
                    flash('INVITE COPIED')
                  }
                } else {
                  await copyInvite(code, displayName)
                  playSound('click')
                  flash('INVITE COPIED')
                }
              } catch {
                playSound('error')
                flash('SHARE FAILED')
              }
            })()
          }}
        >
          {canNativeShare() ? 'MORE…' : 'COPY INVITE'}
        </PixelButton>
      </div>
      {status && (
        <p
          className="pixel-label text-center"
          style={{ fontSize: 6, color: 'var(--spidey-green)' }}
          role="status"
        >
          {status}
        </p>
      )}
      <p className="pixel-label text-center" style={{ fontSize: 5, color: 'var(--spidey-text-dim)' }}>
        IG: INVITE COPIES — PASTE IN DM / STORY
      </p>
    </div>
  )
}

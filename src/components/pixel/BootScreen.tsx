import { useEffect, useState } from 'react'
import { SpiderMaskIcon } from '../../assets/spiders/SpiderAvatar'
import { PixelButton } from './PixelButton'
import { PixelLoader } from './PixelLoader'

type Props = {
  onSignIn: () => void
  loading?: boolean
  error?: string | null
  skipAnimation?: boolean
  configured?: boolean
}

const STEPS = [
  'INITIALIZING SYSTEM...',
  'CALIBRATING SPIDER SENSE...',
  'CONNECTING TO WEB...',
  'PRIVATE NETWORK ONLINE',
]

export function BootScreen({
  onSignIn,
  loading,
  error,
  skipAnimation,
  configured = true,
}: Props) {
  const [step, setStep] = useState(skipAnimation ? STEPS.length - 1 : 0)
  const [ready, setReady] = useState(Boolean(skipAnimation))

  useEffect(() => {
    if (skipAnimation) return
    // Don't create AudioContext here — browsers block it until a click
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      if (i >= STEPS.length) {
        window.clearInterval(id)
        setReady(true)
        return
      }
      setStep(i)
    }, 700)
    return () => window.clearInterval(id)
  }, [skipAnimation])

  return (
    <div
      className="min-h-dvh w-full flex flex-col items-center justify-center relative overflow-hidden px-4"
      style={{ background: 'var(--spidey-bg-deep)' }}
    >
      <div className="scanlines" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(92,225,230,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(92,225,230,0.06) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md w-full text-center crt-flicker">
        <p className="pixel-label" style={{ color: 'var(--spidey-text-dim)', fontSize: 8 }}>
          {'// PRIVATE NETWORK //'}
        </p>

        <h1
          className="font-[family-name:var(--font-pixel)] text-[clamp(16px,4vw,28px)] leading-relaxed"
          style={{ color: 'var(--spidey-white)', textShadow: '3px 3px 0 #020810' }}
        >
          SPIDEY
          <span className="inline-flex mx-2 align-middle">
            <SpiderMaskIcon size={36} />
          </span>
          TRACKER
        </h1>

        <div
          className="pixel-inset p-4 w-full"
          style={{ borderColor: 'var(--spidey-frame)' }}
        >
          {!ready ? (
            <PixelLoader label={STEPS[step]} progress={((step + 1) / STEPS.length) * 100} />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="pixel-label blink" style={{ color: 'var(--spidey-green)' }}>
                SYSTEM READY
              </p>
              {!configured && (
                <p
                  className="font-[family-name:var(--font-readable)] text-xl"
                  style={{ color: 'var(--spidey-yellow)' }}
                >
                  Firebase not configured. Copy .env.example → .env
                </p>
              )}
              {error && (
                <p
                  className="font-[family-name:var(--font-readable)] text-xl"
                  style={{ color: 'var(--spidey-red)' }}
                  role="alert"
                >
                  {error}
                </p>
              )}
              <PixelButton
                onClick={onSignIn}
                disabled={loading || !configured}
                className="w-full max-w-xs"
                aria-label="Sign in with Google"
              >
                {loading ? 'VERIFYING...' : 'SIGN IN WITH GOOGLE'}
              </PixelButton>
            </div>
          )}
        </div>

        <p className="pixel-label" style={{ color: 'var(--spidey-text-dim)', fontSize: 7 }}>
          MADE BY MANISH
        </p>
      </div>
    </div>
  )
}

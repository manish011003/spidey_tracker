import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PixelButton } from './PixelButton'

const INTRO_SRC = '/videos/intro.mp4'
const INTRO_MAX_MS = 10_000
const INTRO_SEEN_KEY = 'spidey_intro_seen_v1'

function hasSeenIntro(): boolean {
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function markIntroSeen(): void {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1')
  } catch {
    /* private mode */
  }
}

type Props = {
  children: ReactNode
}

/**
 * Full-screen intro clip — plays once per browser session (max 10s), skippable.
 */
export function IntroCinematic({ children }: Props) {
  const [active, setActive] = useState(() => !hasSeenIntro())
  const [muted, setMuted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const finishedRef = useRef(false)

  const finish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    markIntroSeen()
    const el = videoRef.current
    if (el) {
      el.pause()
    }
    setActive(false)
  }

  useEffect(() => {
    if (!active) return

    const el = videoRef.current
    if (!el) return

    let timer: number | undefined

    const start = async () => {
      try {
        el.currentTime = 0
        el.muted = false
        await el.play()
        setMuted(false)
      } catch {
        // Autoplay with sound is often blocked — fall back to muted
        try {
          el.muted = true
          setMuted(true)
          await el.play()
        } catch {
          // If play still fails, don't trap the user
          finish()
          return
        }
      }
      timer = window.setTimeout(finish, INTRO_MAX_MS)
    }

    void start()

    return () => {
      if (timer) window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finish is stable for this mount
  }, [active])

  return (
    <>
      {children}
      {active && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: '#020810' }}
          role="dialog"
          aria-modal="true"
          aria-label="Spidey Tracker intro"
        >
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            src={INTRO_SRC}
            playsInline
            preload="auto"
            // Play once — no loop
            onEnded={finish}
            onError={finish}
          />

          <div className="absolute inset-0 pointer-events-none scanlines opacity-40" />

          <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between gap-2 z-10">
            <p className="pixel-label" style={{ color: 'var(--spidey-cyan)', fontSize: 7 }}>
              SPIDEY TRACKER · INTRO
            </p>
            {muted && (
              <button
                type="button"
                className="pixel-btn pixel-btn--ghost !text-[7px] !py-2 !px-3 pointer-events-auto"
                onClick={() => {
                  const el = videoRef.current
                  if (!el) return
                  el.muted = false
                  setMuted(false)
                  void el.play()
                }}
              >
                TAP FOR SOUND
              </button>
            )}
          </div>

          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10 px-4">
            <PixelButton
              variant="orange"
              className="!text-[10px] !py-3 !px-6 min-w-[140px]"
              onClick={finish}
            >
              SKIP →
            </PixelButton>
          </div>
        </div>
      )}
    </>
  )
}

import type { ReactNode } from 'react'
import { PixelSpideySprite } from '../../assets/ui/PixelSpideySprite'
import { RadarWidget } from '../pixel/RadarWidget'
import type { SuitId } from '../../types'

type Props = {
  header: ReactNode
  sideControls: ReactNode
  map: ReactNode
  ticker: ReactNode
  toolbar?: ReactNode
  linkAction?: ReactNode
  radarMode?: 'idle' | 'nearby' | 'updating'
  banner?: ReactNode
  suitId?: SuitId
  /** Open character dossier when the big deck spider is clicked */
  onSpriteClick?: () => void
  spriteLevel?: number
}

export function TrackerShell({
  header,
  sideControls,
  map,
  ticker,
  toolbar,
  linkAction,
  radarMode = 'idle',
  banner,
  suitId = 'classic',
  onSpriteClick,
  spriteLevel,
}: Props) {
  return (
    <div
      className="tracker-shell min-h-dvh w-full flex flex-col items-center justify-start md:justify-center p-1.5 sm:p-3 md:p-5 relative overflow-x-hidden overflow-y-auto"
      style={{ background: 'var(--spidey-bg-deep)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 35%, #0b2035 0%, #040c18 68%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(92,225,230,0.015) 3px, rgba(92,225,230,0.015) 4px)',
        }}
      />

      <div className="relative z-10 w-full max-w-[1180px] flex flex-col gap-1.5 sm:gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {banner}

        <div className="pixel-frame p-1.5 sm:p-3 md:p-[14px]">
          <span
            className="absolute bottom-[14px] left-[14px] w-2 h-2 z-[2] pointer-events-none hidden sm:block"
            style={{
              background: 'var(--spidey-black)',
              boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.25), 0 0 0 2px var(--spidey-frame-light)',
            }}
            aria-hidden
          />
          <span
            className="absolute bottom-[14px] right-[14px] w-2 h-2 z-[2] pointer-events-none hidden sm:block"
            style={{
              background: 'var(--spidey-black)',
              boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.25), 0 0 0 2px var(--spidey-frame-light)',
            }}
            aria-hidden
          />

          <div className="mb-1.5 sm:mb-3 relative z-[3]">{header}</div>

          <div className="relative">
            <div className="absolute left-0 top-2 bottom-8 w-[4px] tech-markings-v z-20 opacity-60 pointer-events-none hidden sm:block" />
            <div className="absolute right-0 top-2 bottom-8 w-[4px] tech-markings-v z-20 opacity-40 pointer-events-none hidden sm:block" />

            <div className="flex gap-2 sm:gap-3">
              <div className="hidden md:flex flex-col justify-center gap-3 z-30 pl-1">
                {sideControls}
              </div>

              <div
                className="relative flex-1 pixel-inset overflow-hidden tracker-map-slot"
                style={{ borderColor: 'var(--spidey-black)' }}
              >
                <div className="absolute inset-0 z-0">{map}</div>
                <div className="scanlines z-10" />
                <div
                  className="absolute inset-0 z-[1] pointer-events-none opacity-[0.16]"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(92,225,230,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(92,225,230,0.35) 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                  }}
                />

                <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 z-20 scale-75 sm:scale-100 origin-bottom-right">
                  <RadarWidget mode={radarMode} />
                </div>
              </div>
            </div>

            {/* Mobile control rail — compact, never under a fixed CTA */}
            <div className="flex md:hidden justify-center gap-2 mt-2 px-1">{sideControls}</div>
          </div>

          {/* In-flow link CTA (replaces overlapping fixed button) */}
          {linkAction && <div className="mt-2 md:mt-3 relative z-[3]">{linkAction}</div>}

          <div className="mt-2 sm:mt-3 relative z-[3]">
            <div className="pixel-deck">
              <div className="tracker-sprite-slot flex items-end justify-center md:justify-start shrink-0">
                <button
                  type="button"
                  className="spider-idle tracker-sprite tracker-sprite--btn"
                  onClick={onSpriteClick}
                  aria-label="Open spider dossier"
                  title="YOUR SPIDER — TAP FOR DOSSIER"
                >
                  <PixelSpideySprite size={168} suitId={suitId} />
                  {spriteLevel != null && (
                    <span className="tracker-sprite__lvl pixel-label">LVL {spriteLevel}</span>
                  )}
                </button>
              </div>

              <div className="w-full min-w-0">{ticker}</div>

              <div className="pixel-deck__corners hidden md:flex flex-col gap-2 items-stretch min-w-[140px]">
                {toolbar}
              </div>
            </div>

            <div className="md:hidden mt-2">{toolbar}</div>
          </div>
        </div>

        <footer className="flex flex-col items-center gap-1 py-2 select-none">
          <p
            className="pixel-label"
            style={{ color: 'var(--spidey-text-dim)', fontSize: 6, letterSpacing: 2 }}
          >
            MADE BY MANISH
          </p>
          <p className="pixel-label" style={{ color: 'var(--spidey-frame-dark)', fontSize: 5 }}>
            SPIDEY TRACKER // PRIVATE NETWORK
          </p>
        </footer>
      </div>
    </div>
  )
}

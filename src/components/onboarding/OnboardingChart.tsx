import { PixelModal } from '../pixel/PixelModal'
import { PixelButton } from '../pixel/PixelButton'
import { SpideyLogo } from '../../assets/spiders/SpiderAvatar'
import { playSound } from '../../services/sound/audio'

type Props = {
  open: boolean
  onClose: () => void
  /** First-time run vs opened from info button */
  firstRun?: boolean
}

const STEPS: Array<{
  n: string
  title: string
  body: string
  accent: string
}> = [
  {
    n: '01',
    title: 'SHARE YOUR WEB',
    body: 'Turn on location sharing in Spider Info so your partner & friends can find you on the map.',
    accent: 'var(--spidey-green)',
  },
  {
    n: '02',
    title: 'LINK A PARTNER',
    body: 'Share your spider code or enter theirs under LINK PARTNER. One exclusive partner slot for BF/GF.',
    accent: 'var(--spidey-orange)',
  },
  {
    n: '03',
    title: 'ADD FRIENDS',
    body: 'Send a friend request with a spider code. Accept requests in FRIENDS. Map pins only if they opt in to share location.',
    accent: 'var(--spidey-cyan)',
  },
  {
    n: '04',
    title: 'TAP THE OTHER SPIDER',
    body: 'Top-right spider opens partner — or a dropdown if you have friends. Nudge, find, or remove from there.',
    accent: 'var(--spidey-yellow)',
  },
  {
    n: '05',
    title: 'MAP CONTROLS',
    body: 'Green = you · Red = find spider · ★ = events · i = this guide. Center Me / Find Spider live under the map.',
    accent: 'var(--spidey-red)',
  },
]

/**
 * Visual how-to chart — shown once after first tracker visit,
 * and reopenable from the cyan info (i) side button.
 */
export function OnboardingChart({ open, onClose, firstRun = false }: Props) {
  return (
    <PixelModal open={open} title={firstRun ? 'WELCOME TO THE WEB' : 'SPIDER WEB GUIDE'} onClose={onClose} wide>
      <div className="onboard-chart flex flex-col gap-3">
        <div className="onboard-chart__hero flex items-center gap-3">
          <SpideyLogo suitId="classic" size={48} pulse />
          <div>
            <p className="pixel-label" style={{ color: 'var(--spidey-yellow)', fontSize: 8 }}>
              {firstRun ? 'FIRST SIGNAL DETECTED' : 'FIELD MANUAL'}
            </p>
            <p
              className="font-[family-name:var(--font-readable)] text-lg leading-snug mt-1"
              style={{ color: 'var(--spidey-text)' }}
            >
              How Spidey Tracker works — partner, friends, map & nudges.
            </p>
          </div>
        </div>

        <ol className="onboard-chart__steps" aria-label="Onboarding steps">
          {STEPS.map((step, i) => (
            <li key={step.n} className="onboard-chart__step">
              <div className="onboard-chart__rail" aria-hidden>
                <span className="onboard-chart__dot" style={{ background: step.accent }} />
                {i < STEPS.length - 1 ? <span className="onboard-chart__line" /> : null}
              </div>
              <div className="onboard-chart__card" style={{ borderColor: step.accent }}>
                <span className="pixel-label onboard-chart__n" style={{ color: step.accent }}>
                  {step.n}
                </span>
                <p className="pixel-label" style={{ color: 'var(--spidey-white)', fontSize: 8, margin: '4px 0' }}>
                  {step.title}
                </p>
                <p
                  className="font-[family-name:var(--font-readable)] text-base leading-snug"
                  style={{ color: 'var(--spidey-text-dim)', margin: 0 }}
                >
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="onboard-chart__legend pixel-inset p-2 flex flex-wrap gap-2 justify-center">
          <LegendChip color="var(--spidey-green)" label="YOU" />
          <LegendChip color="var(--spidey-red)" label="FIND" />
          <LegendChip color="var(--spidey-yellow)" label="EVENTS" />
          <LegendChip color="var(--spidey-cyan)" label="GUIDE" />
        </div>

        <PixelButton
          className="w-full"
          onClick={() => {
            playSound('click')
            onClose()
          }}
        >
          {firstRun ? 'ENTER THE TRACKER' : 'GOT IT'}
        </PixelButton>
      </div>
    </PixelModal>
  )
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1" style={{ border: `2px solid ${color}` }}>
      <span className="w-2.5 h-2.5 inline-block" style={{ background: color }} aria-hidden />
      <span className="pixel-label" style={{ color: 'var(--spidey-text)', fontSize: 6 }}>
        {label}
      </span>
    </span>
  )
}

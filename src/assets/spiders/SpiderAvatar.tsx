import classicLogo from '../ui/logos/classic.png'
import ghostLogo from '../ui/logos/ghost.png'
import blackLogo from '../ui/logos/black.png'
import scarletLogo from '../ui/logos/scarlet.png'
import noirLogo from '../ui/logos/noir.png'
import ironLogo from '../ui/logos/iron.png'
import futureLogo from '../ui/logos/future.png'
import americaLogo from '../ui/logos/america.png'
import stealthLogo from '../ui/logos/stealth.png'
import neonLogo from '../ui/logos/neon.png'
import spiderClassic from '../ui/logos/spiders/classic.png'
import spiderBlack from '../ui/logos/spiders/black.png'
import spiderScarlet from '../ui/logos/spiders/scarlet.png'
import spiderNoir from '../ui/logos/spiders/noir.png'
import spiderIron from '../ui/logos/spiders/iron.png'
import spiderFuture from '../ui/logos/spiders/future.png'
import spiderNeon from '../ui/logos/spiders/neon.png'
import spiderMystery from '../ui/logos/spiders/mystery.png'
import type { SuitId, SpiderId } from '../../types'

const SUIT_LOGOS: Record<string, string> = {
  classic: classicLogo,
  ghost: ghostLogo,
  mystery: ghostLogo,
  black: blackLogo,
  scarlet: scarletLogo,
  noir: noirLogo,
  iron: ironLogo,
  future: futureLogo,
  america: americaLogo,
  stealth: stealthLogo,
  neon: neonLogo,
}

const SPIDER_LOGOS: Record<string, string> = {
  classic: spiderClassic,
  black: spiderBlack,
  scarlet: spiderScarlet,
  noir: spiderNoir,
  iron: spiderIron,
  future: spiderFuture,
  neon: spiderNeon,
  mystery: spiderMystery,
}

/** Pre-tinted logo.png URL for a suit. */
export function getSuitLogoUrl(suitId?: SuitId | string): string {
  if (!suitId) return classicLogo
  return SUIT_LOGOS[suitId] ?? classicLogo
}

/** Pre-tinted logo.png URL for a spider character. */
export function getSpiderLogoUrl(spiderId?: SpiderId | string): string {
  if (!spiderId) return spiderClassic
  return SPIDER_LOGOS[spiderId] ?? spiderClassic
}

/**
 * Prefer suit tint when provided (map markers / profile suit),
 * otherwise spider character tint (onboarding / avatar picker).
 */
export function getLogoUrl(opts: { suitId?: SuitId | string; spiderId?: SpiderId | string }): string {
  if (opts.suitId) return getSuitLogoUrl(opts.suitId)
  if (opts.spiderId) return getSpiderLogoUrl(opts.spiderId)
  return classicLogo
}

type LogoProps = {
  suitId?: SuitId
  spiderId?: SpiderId
  size?: number
  className?: string
  pulse?: boolean
  /** Soft drop shadow under the mask */
  shadow?: boolean
}

/**
 * Polished Spidey mask from logo.png, tinted per suit/spider.
 */
export function SpideyLogo({
  suitId,
  spiderId,
  size = 40,
  className = '',
  pulse = false,
  shadow = true,
}: LogoProps) {
  const src = getLogoUrl({ suitId, spiderId })

  return (
    <span
      className={`spidey-logo ${pulse ? 'spidey-logo--pulse' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
      }}
      aria-hidden
    >
      {pulse && <span className="spidey-logo__ring" />}
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        draggable={false}
        style={{
          width: size,
          height: size,
          imageRendering: 'pixelated',
          display: 'block',
          filter: shadow ? 'drop-shadow(1px 2px 0 #020810)' : undefined,
        }}
      />
    </span>
  )
}

/** Drop-in replacement for old stick-figure SpiderAvatar. */
export function SpiderAvatar(props: LogoProps) {
  return <SpideyLogo {...props} />
}

export function SpiderMaskIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return <SpideyLogo suitId="classic" size={size} className={className} />
}

export function MiniSpiderIcon({
  size = 22,
  suitId = 'classic',
  spiderId,
}: {
  color?: string
  size?: number
  suitId?: SuitId
  spiderId?: SpiderId
}) {
  return <SpideyLogo suitId={spiderId ? undefined : suitId} spiderId={spiderId} size={size} shadow={false} />
}

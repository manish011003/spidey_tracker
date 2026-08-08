import type { SuitId } from '../../types'
import ironGif from '../suits/iron.gif'
import americaGif from '../suits/america.gif'
import classicPng from '../suits/classic.png'
import blackPng from '../suits/black.png'
import scarletPng from '../suits/scarlet.png'
import noirPng from '../suits/noir.png'
import futurePng from '../suits/future.png'
import stealthPng from '../suits/stealth.png'
import mysteryPng from '../suits/mystery.png'

/** SVG only when no sheet/GIF asset exists for a suit. */
function FallbackSvg({ size = 80 }: { size?: number }) {
  const R = '#E53935'
  const Rd = '#B71C1C'
  const B = '#1565C0'
  const Bd = '#0D47A1'
  const W = '#F5FBFF'
  const K = '#020810'
  const web = '#0D47A1'

  return (
    <svg
      width={size}
      height={Math.round(size * (64 / 48))}
      viewBox="0 0 48 64"
      style={{ imageRendering: 'pixelated' }}
      aria-hidden
    >
      <rect x="10" y="60" width="28" height="3" fill={K} opacity="0.35" />
      <rect x="14" y="4" width="20" height="2" fill={K} />
      <rect x="12" y="6" width="24" height="2" fill={K} />
      <rect x="10" y="8" width="28" height="14" fill={K} />
      <rect x="14" y="6" width="20" height="2" fill={R} />
      <rect x="12" y="8" width="24" height="12" fill={R} />
      <rect x="14" y="20" width="20" height="2" fill={Rd} />
      <rect x="14" y="10" width="8" height="8" fill={K} />
      <rect x="26" y="10" width="8" height="8" fill={K} />
      <rect x="15" y="11" width="6" height="6" fill={W} />
      <rect x="27" y="11" width="6" height="6" fill={W} />
      <rect x="16" y="12" width="2" height="4" fill={B} />
      <rect x="28" y="12" width="2" height="4" fill={B} />
      <rect x="23" y="6" width="2" height="16" fill={web} opacity="0.55" />
      <rect x="12" y="22" width="24" height="2" fill={K} />
      <rect x="10" y="24" width="28" height="16" fill={K} />
      <rect x="12" y="24" width="24" height="14" fill={R} />
      <rect x="16" y="28" width="16" height="8" fill={B} />
      <rect x="22" y="25" width="4" height="5" fill={K} />
      <rect x="4" y="26" width="8" height="4" fill={K} />
      <rect x="5" y="26" width="6" height="3" fill={R} />
      <rect x="36" y="26" width="8" height="4" fill={K} />
      <rect x="37" y="26" width="6" height="3" fill={R} />
      <rect x="12" y="38" width="10" height="12" fill={K} />
      <rect x="26" y="38" width="10" height="12" fill={K} />
      <rect x="13" y="38" width="8" height="10" fill={B} />
      <rect x="27" y="38" width="8" height="10" fill={B} />
      <rect x="8" y="52" width="14" height="6" fill={K} />
      <rect x="26" y="52" width="14" height="6" fill={K} />
      <rect x="9" y="52" width="12" height="4" fill={R} />
      <rect x="27" y="52" width="12" height="4" fill={R} />
      <rect x="14" y="40" width="6" height="6" fill={Bd} />
      <rect x="28" y="40" width="6" height="6" fill={Bd} />
    </svg>
  )
}

/** Animated GIFs take priority; sheet PNGs fill the rest. */
const SUIT_SPRITES: Partial<Record<SuitId, string>> = {
  iron: ironGif,
  america: americaGif,
  classic: classicPng,
  black: blackPng,
  scarlet: scarletPng,
  noir: noirPng,
  future: futurePng,
  stealth: stealthPng,
  mystery: mysteryPng,
  ghost: mysteryPng,
}

type Props = {
  size?: number
  suitId?: SuitId
}

/**
 * Corner frame sprite keyed by suit type.
 * IRON / AMERICA → cropped animated GIFs
 * CLASSIC / BLACK / SCARLET / NOIR / FUTURE / STEALTH / MYSTERY → sheet crops
 * NEON (no asset yet) → SVG fallback
 */
export function PixelSpideySprite({ size = 96, suitId = 'classic' }: Props) {
  const src = SUIT_SPRITES[suitId]

  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        draggable={false}
        aria-hidden
        className="suit-corner-sprite"
        style={{
          width: '100%',
          height: 'auto',
          maxWidth: size,
          aspectRatio: '1',
          objectFit: 'contain',
          objectPosition: 'bottom center',
          imageRendering: 'pixelated',
          background: 'transparent',
          display: 'block',
        }}
      />
    )
  }

  return <FallbackSvg size={size} />
}

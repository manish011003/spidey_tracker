import { useMemo } from 'react'
import type { SuitId } from '../../types'
import { getSuit } from '../../data/suits'
import { getSuitLogoUrl } from '../spiders/SpiderAvatar'

type Props = {
  suitId?: SuitId
  size?: number
  label?: string
  message?: string
  notification?: string
  onClick?: () => void
  className?: string
  floating?: boolean
}

/**
 * Cropped Spidey logo avatar — suit-tinted, floating hover, tooltip message.
 */
export function HoverLogoAvatar({
  suitId = 'classic',
  size = 48,
  label = 'SPIDER',
  message,
  notification,
  onClick,
  className = '',
  floating = true,
}: Props) {
  const suit = getSuit(suitId)
  const src = getSuitLogoUrl(suitId)
  const tip = useMemo(() => {
    const parts = [label]
    if (message) parts.push(message)
    if (notification) parts.push(notification)
    return parts.join(' · ')
  }, [label, message, notification])

  return (
    <button
      type="button"
      className={`hover-logo-avatar ${floating ? 'hover-logo-avatar--float' : ''} ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      aria-label={tip}
      title={tip}
    >
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
          filter: `drop-shadow(0 0 0 ${suit.primaryColor})`,
        }}
      />
      <span className="hover-logo-avatar__tip" role="tooltip">
        <span className="pixel-label" style={{ color: 'var(--spidey-yellow)', fontSize: 7 }}>
          {label}
        </span>
        {message && (
          <span
            className="font-[family-name:var(--font-readable)]"
            style={{ color: 'var(--spidey-text)', fontSize: 14, display: 'block', marginTop: 2 }}
          >
            {message}
          </span>
        )}
        {notification && (
          <span className="pixel-label" style={{ color: 'var(--spidey-cyan)', fontSize: 6, display: 'block', marginTop: 4 }}>
            ✦ {notification}
          </span>
        )}
      </span>
    </button>
  )
}

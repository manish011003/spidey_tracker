import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { playSound, unlockAudio } from '../../services/sound/audio'

type Variant = 'orange' | 'green' | 'red' | 'cyan' | 'ghost'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
  sound?: boolean
}

const variantClass: Record<Variant, string> = {
  orange: 'pixel-btn--orange',
  green: 'pixel-btn--green',
  red: 'pixel-btn--red',
  cyan: 'pixel-btn--cyan',
  ghost: 'pixel-btn--ghost',
}

export function PixelButton({
  variant = 'orange',
  children,
  sound = true,
  className = '',
  onClick,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={`pixel-btn ${variantClass[variant]} ${className}`}
      onClick={(e) => {
        void unlockAudio()
        if (sound) playSound('click')
        onClick?.(e)
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

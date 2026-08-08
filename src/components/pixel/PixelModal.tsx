import { useEffect, type ReactNode } from 'react'
import { PixelButton } from './PixelButton'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

export function PixelModal({ open, title, onClose, children, wide }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(2, 8, 16, 0.78)' }}
      role="presentation"
      onClick={onClose}
    >
      <div
        className="pixel-panel w-full relative crt-flicker"
        style={{ maxWidth: wide ? 560 : 420 }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-3 py-2 border-b-[3px] border-black"
          style={{ background: 'var(--spidey-blue)' }}
        >
          <h2 className="pixel-label" style={{ color: 'var(--spidey-yellow)', fontSize: 10 }}>
            {title}
          </h2>
          <PixelButton variant="ghost" className="!py-1 !px-2 !text-[8px]" onClick={onClose} aria-label="Close">
            X
          </PixelButton>
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

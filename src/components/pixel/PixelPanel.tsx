import type { ReactNode } from 'react'

type Props = {
  title?: string
  children: ReactNode
  className?: string
  footer?: ReactNode
}

export function PixelPanel({ title, children, className = '', footer }: Props) {
  return (
    <div className={`pixel-panel ${className}`} role="dialog">
      {title && (
        <div
          className="px-3 py-2 border-b-[3px] border-black"
          style={{ background: 'var(--spidey-blue)' }}
        >
          <h2 className="pixel-label" style={{ color: 'var(--spidey-white)', fontSize: 10 }}>
            {title}
          </h2>
        </div>
      )}
      <div className="p-3">{children}</div>
      {footer && (
        <div className="px-3 py-2 border-t-[3px] border-black" style={{ background: 'var(--spidey-panel-2)' }}>
          {footer}
        </div>
      )}
    </div>
  )
}

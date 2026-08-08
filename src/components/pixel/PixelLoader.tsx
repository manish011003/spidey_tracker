type Props = {
  label?: string
  progress?: number
}

export function PixelLoader({ label = 'CONTACTING SPIDER NETWORK...', progress }: Props) {
  const pct = progress !== undefined ? Math.max(0, Math.min(100, progress)) : undefined

  return (
    <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
      <p className="pixel-label text-center" style={{ color: 'var(--spidey-cyan)' }}>
        {label}
      </p>
      <div
        className="w-full max-w-[240px] h-4 border-[3px] border-black"
        style={{ background: 'var(--spidey-bg-deep)', boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.5)' }}
      >
        <div
          className="h-full"
          style={{
            width: pct !== undefined ? `${pct}%` : '40%',
            background: 'var(--spidey-green)',
            animation: pct === undefined ? 'boot-bar 1.8s steps(12) infinite alternate' : undefined,
          }}
        />
      </div>
      {pct !== undefined && (
        <span className="pixel-label" style={{ color: 'var(--spidey-text-dim)' }}>
          {Math.round(pct)}%
        </span>
      )}
    </div>
  )
}

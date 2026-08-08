import { useEffect, useState } from 'react'
import { SpiderMaskIcon } from '../../assets/spiders/SpiderAvatar'
import { PixelButton } from './PixelButton'
import { PixelLoader } from './PixelLoader'

type Props = {
  onSignIn: () => void
  onSendPhoneCode?: (phone: string) => void
  onConfirmPhoneCode?: (code: string) => void
  onCancelPhone?: () => void
  phoneCodeSent?: boolean
  phoneHint?: string | null
  loading?: boolean
  error?: string | null
  skipAnimation?: boolean
  configured?: boolean
  /** Overrides the VERIFYING… button label (e.g. mobile redirect return). */
  statusLabel?: string
}

const STEPS = [
  'INITIALIZING SYSTEM...',
  'CALIBRATING SPIDER SENSE...',
  'CONNECTING TO WEB...',
  'PRIVATE NETWORK ONLINE',
]

export function BootScreen({
  onSignIn,
  onSendPhoneCode,
  onConfirmPhoneCode,
  onCancelPhone,
  phoneCodeSent = false,
  phoneHint = null,
  loading,
  error,
  skipAnimation,
  configured = true,
  statusLabel,
}: Props) {
  const [step, setStep] = useState(skipAnimation ? STEPS.length - 1 : 0)
  const [ready, setReady] = useState(Boolean(skipAnimation))
  const [phoneMode, setPhoneMode] = useState(false)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')

  useEffect(() => {
    if (skipAnimation) return
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      if (i >= STEPS.length) {
        window.clearInterval(id)
        setReady(true)
        return
      }
      setStep(i)
    }, 700)
    return () => window.clearInterval(id)
  }, [skipAnimation])

  useEffect(() => {
    if (phoneCodeSent) setPhoneMode(true)
  }, [phoneCodeSent])

  return (
    <div
      className="min-h-dvh w-full flex flex-col items-center justify-center relative overflow-hidden px-4"
      style={{ background: 'var(--spidey-bg-deep)' }}
    >
      <div className="scanlines" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(92,225,230,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(92,225,230,0.06) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Invisible reCAPTCHA host for phone auth */}
      <div id="spidey-recaptcha" className="hidden" aria-hidden />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md w-full text-center crt-flicker">
        <p className="pixel-label" style={{ color: 'var(--spidey-text-dim)', fontSize: 8 }}>
          {'// PRIVATE NETWORK //'}
        </p>

        <h1
          className="font-[family-name:var(--font-pixel)] text-[clamp(16px,4vw,28px)] leading-relaxed"
          style={{ color: 'var(--spidey-white)', textShadow: '3px 3px 0 #020810' }}
        >
          SPIDEY
          <span className="inline-flex mx-2 align-middle">
            <SpiderMaskIcon size={36} />
          </span>
          TRACKER
        </h1>

        <div className="pixel-inset p-4 w-full" style={{ borderColor: 'var(--spidey-frame)' }}>
          {!ready ? (
            <PixelLoader label={STEPS[step]} progress={((step + 1) / STEPS.length) * 100} />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p className="pixel-label blink" style={{ color: 'var(--spidey-green)' }}>
                SYSTEM READY
              </p>
              {!configured && (
                <p
                  className="font-[family-name:var(--font-readable)] text-xl"
                  style={{ color: 'var(--spidey-yellow)' }}
                >
                  Firebase not configured. Copy .env.example → .env
                </p>
              )}
              {error && (
                <p
                  className="font-[family-name:var(--font-readable)] text-xl"
                  style={{ color: 'var(--spidey-red)' }}
                  role="alert"
                >
                  {error}
                </p>
              )}

              {!phoneMode ? (
                <>
                  <PixelButton
                    onClick={onSignIn}
                    disabled={loading || !configured}
                    className="w-full max-w-xs"
                    aria-label="Sign in with Google"
                  >
                    {loading ? statusLabel || 'VERIFYING...' : 'SIGN IN WITH GOOGLE'}
                  </PixelButton>
                  {onSendPhoneCode && (
                    <PixelButton
                      variant="cyan"
                      className="w-full max-w-xs !text-[7px]"
                      disabled={loading || !configured}
                      onClick={() => {
                        setPhoneMode(true)
                      }}
                    >
                      SIGN IN WITH PHONE
                    </PixelButton>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-2 w-full max-w-xs text-left">
                  <p className="pixel-label text-center" style={{ fontSize: 6, color: 'var(--spidey-cyan)' }}>
                    {phoneCodeSent ? 'ENTER SMS CODE' : 'PHONE SIGN-IN'}
                  </p>
                  {!phoneCodeSent ? (
                    <>
                      <input
                        className="pixel-input w-full text-center"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="+91XXXXXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={loading}
                        aria-label="Phone number"
                      />
                      <p
                        className="pixel-label text-center"
                        style={{ fontSize: 5, color: 'var(--spidey-text-dim)' }}
                      >
                        USE +COUNTRY CODE · 10-DIGIT INDIA → +91
                      </p>
                      <PixelButton
                        className="w-full !text-[7px]"
                        disabled={loading || phone.trim().length < 8}
                        onClick={() => onSendPhoneCode?.(phone)}
                      >
                        {loading ? 'SENDING...' : 'SEND SMS CODE'}
                      </PixelButton>
                    </>
                  ) : (
                    <>
                      {phoneHint && (
                        <p
                          className="pixel-label text-center"
                          style={{ fontSize: 6, color: 'var(--spidey-yellow)' }}
                        >
                          CODE SENT → {phoneHint}
                        </p>
                      )}
                      <input
                        className="pixel-input w-full text-center tracking-[0.4em]"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="••••••"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        disabled={loading}
                        aria-label="SMS verification code"
                      />
                      <PixelButton
                        className="w-full !text-[7px]"
                        disabled={loading || otp.length !== 6}
                        onClick={() => onConfirmPhoneCode?.(otp)}
                      >
                        {loading ? 'VERIFYING...' : 'VERIFY & ENTER'}
                      </PixelButton>
                      <PixelButton
                        variant="ghost"
                        className="w-full !text-[6px]"
                        disabled={loading}
                        onClick={() => {
                          setOtp('')
                          onSendPhoneCode?.(phoneHint || phone)
                        }}
                      >
                        RESEND CODE
                      </PixelButton>
                    </>
                  )}
                  <PixelButton
                    variant="ghost"
                    className="w-full !text-[6px]"
                    disabled={loading}
                    onClick={() => {
                      setPhoneMode(false)
                      setOtp('')
                      onCancelPhone?.()
                    }}
                  >
                    BACK
                  </PixelButton>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="pixel-label" style={{ color: 'var(--spidey-text-dim)', fontSize: 7 }}>
          MADE BY MANISH
        </p>
      </div>
    </div>
  )
}

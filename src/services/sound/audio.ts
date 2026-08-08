type SoundName = 'click' | 'signal' | 'connect' | 'event' | 'boot' | 'error' | 'nudge' | 'pair'

let enabled = false
let unlocked = false
let ctx: AudioContext | null = null
let ringtoneEl: HTMLAudioElement | null = null

const RINGTONE_URL = '/sounds/spider-ringtone.mp3'

function getCtx(create = false): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    if (!create) return null
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    ctx = new AudioCtx()
  }
  return ctx
}

function getRingtone(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (!ringtoneEl) {
    ringtoneEl = new Audio(RINGTONE_URL)
    ringtoneEl.preload = 'auto'
  }
  return ringtoneEl
}

export function setSoundEnabled(value: boolean): void {
  enabled = value
}

export function isSoundEnabled(): boolean {
  return enabled
}

export async function unlockAudio(): Promise<void> {
  // Only create AudioContext from a user gesture (sign-in / toggle sound)
  const audio = getCtx(true)
  if (!audio) return
  try {
    if (audio.state === 'suspended') await audio.resume()
    unlocked = true
    const ring = getRingtone()
    if (ring) ring.load()
  } catch {
    // Autoplay policy — ignore until next gesture
  }
}

function beep(freq: number, duration: number, type: OscillatorType = 'square', gain = 0.04): void {
  if (!enabled || !unlocked) return
  const audio = getCtx(false)
  if (!audio) return

  const osc = audio.createOscillator()
  const g = audio.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.value = gain
  osc.connect(g)
  g.connect(audio.destination)
  const now = audio.currentTime
  g.gain.setValueAtTime(gain, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + duration)
  osc.start(now)
  osc.stop(now + duration)
}

/** Spidey ringtone — used for first pair + partner nudge. */
export async function playRingtone(): Promise<void> {
  if (!enabled) return
  // Resume context only if already created by a gesture
  const audio = getCtx(false)
  if (audio?.state === 'suspended') {
    try {
      await audio.resume()
    } catch {
      /* ignore */
    }
  }
  const ring = getRingtone()
  if (!ring) return
  try {
    ring.currentTime = 0
    ring.volume = 0.85
    await ring.play()
  } catch {
    // Autoplay may still be blocked until the user interacts
  }
}

export function stopRingtone(): void {
  if (!ringtoneEl) return
  ringtoneEl.pause()
  ringtoneEl.currentTime = 0
}

export function playSound(name: SoundName): void {
  if (name === 'connect' || name === 'pair' || name === 'nudge') {
    void playRingtone()
    return
  }

  switch (name) {
    case 'click':
      beep(440, 0.05)
      break
    case 'signal':
      beep(660, 0.08)
      setTimeout(() => beep(880, 0.08), 80)
      break
    case 'event':
      beep(784, 0.08)
      setTimeout(() => beep(988, 0.12), 90)
      break
    case 'boot':
      beep(220, 0.1)
      setTimeout(() => beep(330, 0.1), 120)
      setTimeout(() => beep(440, 0.15), 240)
      break
    case 'error':
      beep(180, 0.2, 'sawtooth', 0.03)
      break
  }
}

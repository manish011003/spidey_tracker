/** Invite / spider-code sharing helpers (WhatsApp, native share, clipboard). */

const DEFAULT_APP_URL = 'https://spidey-tracker-pi.vercel.app'

export function getAppShareUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin
    // Prefer production URL when running on localhost so invites work for friends
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return DEFAULT_APP_URL
    }
    return origin
  }
  return DEFAULT_APP_URL
}

export function buildInviteMessage(code: string, displayName?: string): string {
  const who = displayName?.trim() ? displayName.trim() : 'a spider'
  const url = getAppShareUrl()
  return [
    `Join me on SPIDEY TRACKER — ${who} wants you in the web.`,
    ``,
    `My spider code: ${code}`,
    `Open the tracker and enter the code to link / add friend.`,
    url,
  ].join('\n')
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

export async function copyInvite(code: string, displayName?: string): Promise<void> {
  await copyText(buildInviteMessage(code, displayName))
}

export async function copyCodeOnly(code: string): Promise<void> {
  await copyText(code)
}

/** Opens WhatsApp with a prefilled invite (works on mobile + web). */
export function shareOnWhatsApp(code: string, displayName?: string): void {
  const text = buildInviteMessage(code, displayName)
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Instagram has no reliable web prefill. Copy invite, then try to open Instagram.
 * User pastes into DM / story.
 */
export async function shareToInstagram(code: string, displayName?: string): Promise<'copied'> {
  await copyInvite(code, displayName)
  // Deep link — may open app on mobile; harmless if it fails
  try {
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer')
  } catch {
    /* ignore */
  }
  return 'copied'
}

export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

/** System share sheet (WhatsApp / Instagram / Messages on supported devices). */
export async function nativeShareInvite(
  code: string,
  displayName?: string,
): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (!canNativeShare()) return 'unsupported'
  const text = buildInviteMessage(code, displayName)
  try {
    await navigator.share({
      title: 'SPIDEY TRACKER',
      text,
      url: getAppShareUrl(),
    })
    return 'shared'
  } catch (e) {
    // User dismissed share sheet
    if ((e as { name?: string })?.name === 'AbortError') return 'cancelled'
    throw e
  }
}

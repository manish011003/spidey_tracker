const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generatePartnerCode(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[bytes[i]! % ALPHABET.length]
    if (i === 3) code += '-'
  }
  return code
}

export function normalizePartnerCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
    .replace(/^(.{4})(.+)$/, '$1-$2')
}

export function isValidPartnerCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalizePartnerCode(code))
}
